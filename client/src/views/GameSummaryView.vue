<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useGameStore } from '@/stores/game';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppContainer from '@/components/layout/AppContainer.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import TurnHistory from '@/components/game/TurnHistory.vue';
import LegProgress from '@/components/game/LegProgress.vue';
import AuthNudge from '@/components/auth/AuthNudge.vue';

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();

const {
  gameId,
  state,
  player1Name,
  player2Name,
  legWins,
  matchFormat,
  winner,
} = storeToRefs(gameStore);

const winnerName = computed(() => {
  if (winner.value === 0) return player1Name.value;
  if (winner.value === 1) return player2Name.value;
  return null;
});

const allTurns = computed(() => {
  if (!state.value) return [];
  return state.value.legs.flatMap((leg) => leg.turns);
});

const totalTurns = computed(() => allTurns.value.length);

const player1TotalScore = computed(() => {
  if (!state.value) return 0;
  return allTurns.value
    .filter((t) => t.playerIndex === 0 && t.statValue !== null)
    .reduce((sum, t) => sum + (t.statValue ?? 0), 0);
});

const player2TotalScore = computed(() => {
  if (!state.value) return 0;
  return allTurns.value
    .filter((t) => t.playerIndex === 1 && t.statValue !== null)
    .reduce((sum, t) => sum + (t.statValue ?? 0), 0);
});

const legsPlayed = computed(() => state.value?.legs.length ?? 0);

onMounted(async () => {
  const routeGameId = route.params.id as string;
  if (gameId.value !== routeGameId) {
    try {
      await gameStore.loadGame(routeGameId);
    } catch {
      router.replace({ name: 'home' });
    }
  }
});

const handleRematch = () => {
  gameStore.reset();
  router.push({ name: 'play-local' });
};

const handleHome = () => {
  gameStore.reset();
  router.push({ name: 'home' });
};
</script>

<template>
  <AppLayout>
    <AppContainer size="sm" class="py-12 flex flex-col gap-8">
      <!-- Header -->
      <div class="text-center">
        <h1 class="font-display text-3xl mb-2">Match Summary</h1>
        <p v-if="winnerName" class="text-text-muted text-sm">
          <span class="text-primary-light font-semibold">{{ winnerName }}</span> wins!
        </p>
      </div>

      <!-- Final score -->
      <AppCard class="p-6">
        <LegProgress
          :match-format="matchFormat"
          :leg-wins="legWins"
          :current-leg="legsPlayed"
        />

        <div class="grid grid-cols-2 gap-6 mt-6">
          <!-- Player 1 -->
          <div class="flex flex-col items-center gap-2">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-primary/20 text-primary-light text-xs font-display flex items-center justify-center">
                1
              </div>
              <span class="text-sm font-medium text-text-muted">{{ player1Name }}</span>
            </div>
            <span class="font-display text-4xl tabular-nums" :class="winner === 0 ? 'text-primary-light' : 'text-text-muted'">
              {{ legWins[0] }}
            </span>
            <AppBadge v-if="winner === 0" variant="success">Winner</AppBadge>
          </div>

          <!-- Player 2 -->
          <div class="flex flex-col items-center gap-2">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-display flex items-center justify-center">
                2
              </div>
              <span class="text-sm font-medium text-text-muted">{{ player2Name }}</span>
            </div>
            <span class="font-display text-4xl tabular-nums" :class="winner === 1 ? 'text-accent' : 'text-text-muted'">
              {{ legWins[1] }}
            </span>
            <AppBadge v-if="winner === 1" variant="success">Winner</AppBadge>
          </div>
        </div>
      </AppCard>

      <!-- Stats -->
      <AppCard class="p-6">
        <h2 class="font-display text-lg text-text mb-4">Match Stats</h2>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div class="flex flex-col gap-1">
            <span class="font-mono text-2xl font-bold text-text tabular-nums">{{ totalTurns }}</span>
            <span class="text-xs text-text-muted">Total Turns</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="font-mono text-2xl font-bold text-primary-light tabular-nums">{{ player1TotalScore }}</span>
            <span class="text-xs text-text-muted">{{ player1Name }} Points</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="font-mono text-2xl font-bold text-accent tabular-nums">{{ player2TotalScore }}</span>
            <span class="text-xs text-text-muted">{{ player2Name }} Points</span>
          </div>
        </div>
      </AppCard>

      <!-- Turn history (all legs) -->
      <AppCard class="p-4">
        <h3 class="font-display text-sm text-text-muted mb-3">All Turns</h3>
        <TurnHistory
          :turns="allTurns"
          :player1-name="player1Name"
          :player2-name="player2Name"
        />
      </AppCard>

      <!-- Actions -->
      <div class="flex gap-3 justify-center">
        <AppButton variant="primary" @click="handleRematch">
          Rematch
        </AppButton>
        <AppButton variant="secondary" @click="handleHome">
          Home
        </AppButton>
      </div>

      <!-- Auth nudge -->
      <AuthNudge message="Sign in to save your match history and track your stats" />
    </AppContainer>
  </AppLayout>
</template>
