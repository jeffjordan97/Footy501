<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppContainer from '@/components/layout/AppContainer.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppInput from '@/components/ui/AppInput.vue';
import ShareableResult from '@/components/game/ShareableResult.vue';
import DailyCountdown from '@/components/daily/DailyCountdown.vue';
import DailyLeaderboard from '@/components/daily/DailyLeaderboard.vue';
import type { LeaderboardEntry } from '@/components/daily/DailyLeaderboard.vue';
import { useAuthStore } from '@/stores/auth';
import AuthNudge from '@/components/auth/AuthNudge.vue';
import {
  getDailyChallenge,
  getDailyLeaderboard,
  startDailyAttempt,
  type DailyChallenge,
} from '@/lib/api';

const router = useRouter();
const authStore = useAuthStore();

const playerCount = ref<1 | 2>(1);
const player2Name = ref('');
const loadingChallenge = ref(true);
const loadingLeaderboard = ref(true);
const starting = ref(false);
const errorMessage = ref<string | null>(null);

const todaysChallenge = ref<DailyChallenge | null>(null);
const hasPlayed = ref(false);
const personalBest = ref<number | null>(null);
const personalTurns = ref<number | null>(null);
const personalFootballers = ref<string[]>([]);
const leaderboard = ref<readonly LeaderboardEntry[]>([]);

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function dailyStorageKey(): string {
  return `footy501_daily_${todayDateString()}`;
}

function loadLocalResult(): void {
  const stored = localStorage.getItem(dailyStorageKey());
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { score: number; turns: number; footballers?: string[] };
      hasPlayed.value = true;
      personalBest.value = parsed.score;
      personalTurns.value = parsed.turns;
      personalFootballers.value = parsed.footballers ?? [];
    } catch {
      // Corrupted entry -- ignore
    }
  }
}

async function fetchChallenge(): Promise<void> {
  loadingChallenge.value = true;
  try {
    const { challenge } = await getDailyChallenge();
    todaysChallenge.value = challenge;
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load daily challenge';
  } finally {
    loadingChallenge.value = false;
  }
}

async function fetchLeaderboard(): Promise<void> {
  loadingLeaderboard.value = true;
  try {
    const { entries } = await getDailyLeaderboard();
    leaderboard.value = entries.map((e) => ({
      rank: e.rank,
      name: e.displayName,
      score: e.finalScore,
      turns: e.turnsTaken,
    }));
  } catch {
    // Leaderboard is non-critical -- leave empty
    leaderboard.value = [];
  } finally {
    loadingLeaderboard.value = false;
  }
}

onMounted(async () => {
  loadLocalResult();
  await Promise.all([fetchChallenge(), fetchLeaderboard()]);
});

const startDaily = async () => {
  if (hasPlayed.value) return;

  starting.value = true;
  errorMessage.value = null;

  // Auth is required — the server derives userId + displayName from JWT
  if (!authStore.user) {
    errorMessage.value = 'Please sign in to play the daily challenge.';
    starting.value = false;
    return;
  }

  try {
    const p2 = playerCount.value === 2 ? (player2Name.value || 'Player 2') : undefined;
    const { gameId, alreadyPlayed } = await startDailyAttempt(p2);

    if (alreadyPlayed) {
      hasPlayed.value = true;
      errorMessage.value = 'You have already played today\'s challenge.';
      await fetchLeaderboard();
      return;
    }

    router.push({ name: 'game', params: { id: gameId } });
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to start daily challenge';
  } finally {
    starting.value = false;
  }
};

</script>

<template>
  <AppLayout>
    <AppContainer size="sm" class="py-12 flex flex-col gap-8">
      <div class="text-center">
        <h1 class="font-display text-3xl mb-2">Daily Challenge</h1>
        <p class="text-text-muted text-sm">One category, one chance -- compete on the leaderboard</p>
      </div>

      <!-- Loading state -->
      <div v-if="loadingChallenge" class="flex justify-center py-8">
        <svg
          class="animate-spin h-8 w-8 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>

      <!-- Today's challenge -->
      <AppCard v-else-if="todaysChallenge" class="p-6 flex flex-col items-center gap-4 text-center">
        <AppBadge variant="warning">Today's Challenge</AppBadge>
        <h2 class="font-display text-xl text-text">
          {{ todaysChallenge.categoryName }}
        </h2>
        <p class="text-text-muted text-sm">
          {{ todaysChallenge.league }} &middot; {{ todaysChallenge.statType }}
          <template v-if="todaysChallenge.teamName">
            &middot; {{ todaysChallenge.teamName }}
          </template>
        </p>

        <template v-if="!hasPlayed">
          <!-- Player count toggle -->
          <div class="flex rounded-lg bg-bg-elevated p-1 gap-1 w-full max-w-xs">
            <button
              v-for="option in ([1, 2] as const)"
              :key="option"
              class="flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all duration-150 cursor-pointer"
              :class="playerCount === option
                ? 'bg-primary text-white shadow-card'
                : 'text-text-muted hover:text-text'"
              @click="playerCount = option"
            >
              {{ option === 1 ? '1 Player' : '2 Players' }}
            </button>
          </div>

          <!-- Player 2 name (2P mode only) -->
          <AppInput
            v-if="playerCount === 2"
            v-model="player2Name"
            placeholder="Player 2 name"
            class="w-full max-w-xs"
          />

          <AppButton
            variant="primary"
            size="lg"
            :loading="starting"
            :disabled="starting"
            @click="startDaily"
          >
            {{ starting ? 'Starting...' : 'Play Today\'s Challenge' }}
          </AppButton>
        </template>
        <template v-else>
          <ShareableResult
            :category-name="todaysChallenge?.categoryName ?? 'Unknown Category'"
            :target-score="501"
            :final-score="personalBest ?? 0"
            :turns-taken="personalTurns ?? 0"
            :is-winner="personalBest === 0"
            :footballers-named="personalFootballers"
            player2-name="Target"
            :is-daily="true"
            :date="todayDateString()"
          />
        </template>
      </AppCard>

      <!-- Error loading challenge -->
      <AppCard v-else class="p-6 text-center">
        <p class="text-danger text-sm">{{ errorMessage ?? 'Failed to load daily challenge' }}</p>
      </AppCard>

      <!-- Error from starting -->
      <p v-if="errorMessage && todaysChallenge" class="text-danger text-sm text-center -mt-4">
        {{ errorMessage }}
      </p>

      <!-- Next challenge countdown -->
      <AppCard class="p-5 flex flex-col items-center gap-3">
        <span class="text-xs text-text-muted uppercase tracking-wider">Next challenge in</span>
        <DailyCountdown />
      </AppCard>

      <!-- Auth nudge -->
      <AuthNudge message="Sign in to appear on the leaderboard and save your daily streak" />

      <!-- Leaderboard -->
      <AppCard class="p-4">
        <h3 class="font-display text-sm text-text-muted mb-3">Today's Leaderboard</h3>
        <div v-if="loadingLeaderboard" class="flex justify-center py-4">
          <svg
            class="animate-spin h-5 w-5 text-text-muted"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
        <DailyLeaderboard v-else :entries="leaderboard" />
      </AppCard>
    </AppContainer>
  </AppLayout>
</template>
