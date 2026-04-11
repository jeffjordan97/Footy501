<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useGameStore } from '@/stores/game';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppContainer from '@/components/layout/AppContainer.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ScoreBoard from '@/components/game/ScoreBoard.vue';
import PlayerSearch, { type PlayerOption } from '@/components/game/PlayerSearch.vue';
import TurnHistory from '@/components/game/TurnHistory.vue';
import CheckoutCelebration from '@/components/game/CheckoutCelebration.vue';
import BustNotification from '@/components/game/BustNotification.vue';
import AnswerReveal from '@/components/game/AnswerReveal.vue';

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();

const {
  gameId,
  status,
  loading,
  error,
  lastTurnResult,
  player1Name,
  player2Name,
  categoryName,
  player1Score,
  player2Score,
  activePlayerIndex,
  activePlayerName,
  legWins,
  timerDuration,
  turns,
  usedPlayerIds,
  matchPhase,
  legPhase,
  winner,
  targetScore,
  opponentConnected,
  categoryLeague,
  categoryTeamId,
  categoryStatType,
} = storeToRefs(gameStore);

// --- Local UI state ---

const timerRunning = ref(true);
const submitting = ref(false);
const bustVisible = ref(false);
const bustReason = ref('');
const bustPlayerName = ref('');
const errorMessage = ref<string | null>(null);
let errorDismissTimer: ReturnType<typeof setTimeout> | null = null;

// --- Answer toast state ---

interface AnswerToast {
  readonly playerName: string;
  readonly statValue: number;
  readonly scoreDiff: number;
}

const answerToast = ref<AnswerToast | null>(null);
let answerToastTimer: ReturnType<typeof setTimeout> | null = null;

// --- Answer Reveal state ---

interface RevealData {
  readonly footballerName: string;
  readonly nationality: string | null;
  readonly position: string | null;
  readonly statValue: number;
  readonly oldScore: number;
  readonly newScore: number;
  readonly turnResult: string;
  readonly bustMessage: string | null;
}

const revealData = ref<RevealData | null>(null);

// --- Computed ---

const isLegFinished = computed(() => legPhase.value === 'FINISHED');
const isMatchFinished = computed(() => matchPhase.value === 'FINISHED');

const showCelebration = computed(() => isLegFinished.value || isMatchFinished.value);

const celebrationWinnerName = computed(() => {
  if (winner.value === 0) return player1Name.value;
  if (winner.value === 1) return player2Name.value;
  // Leg win: determine from last turn result or active player
  const lastTurn = turns.value.length > 0 ? turns.value[turns.value.length - 1] : null;
  if (lastTurn?.result === 'CHECKOUT') {
    return lastTurn.playerIndex === 0 ? player1Name.value : player2Name.value;
  }
  return activePlayerName.value;
});

const celebrationFinalScore = computed(() => {
  const lastTurn = turns.value.length > 0 ? turns.value[turns.value.length - 1] : null;
  return lastTurn?.scoreAfter ?? 0;
});

const footballersNamed = computed(() =>
  turns.value
    .filter((t): t is typeof t & { footballerName: string } => t.footballerName != null)
    .map((t) => t.footballerName),
);

const isPlayerInputDisabled = computed(() =>
  submitting.value || isLegFinished.value || isMatchFinished.value,
);

const hasTimer = computed(() => timerDuration.value > 0);

// Solo mode: player 2 is a phantom ("Target", "Practice Mode") — auto-skip their turns
const SOLO_PLAYER2_NAMES = new Set(['Target', 'Practice Mode']);
const isSoloMode = computed(() => SOLO_PLAYER2_NAMES.has(player2Name.value));
const isPlayer2Turn = computed(() => activePlayerIndex.value === 1);

// --- Near-miss checkout feedback ---

const activePlayerScore = computed(() =>
  activePlayerIndex.value === 0 ? player1Score.value : player2Score.value,
);

const nearMissInfo = computed<{
  show: boolean;
  message: string;
  colorClass: string;
  pulseClass: string;
} | null>(() => {
  const score = activePlayerScore.value;

  if (isLegFinished.value || isMatchFinished.value) return null;

  // "In checkout range" when score is 0-10 (any answer with stat value up to score+10 would checkout)
  if (score >= 0 && score <= 10) {
    return {
      show: true,
      message: 'IN CHECKOUT RANGE',
      colorClass: 'text-success',
      pulseClass: 'animate-checkout-pulse-strong',
    };
  }

  // Near miss tiers
  if (score >= 11 && score <= 15) {
    return {
      show: true,
      message: `Only ${score} away from checkout!`,
      colorClass: 'text-yellow-400',
      pulseClass: 'animate-checkout-pulse-moderate',
    };
  }

  if (score >= 16 && score <= 20) {
    return {
      show: true,
      message: `Only ${score} away from checkout!`,
      colorClass: 'text-amber-500/70',
      pulseClass: 'animate-checkout-pulse-subtle',
    };
  }

  return null;
});

// --- Lifecycle ---

onMounted(async () => {
  const routeGameId = route.params.id as string;
  if (gameId.value !== routeGameId) {
    await gameStore.loadGame(routeGameId);
  }
});

onUnmounted(() => {
  if (errorDismissTimer) clearTimeout(errorDismissTimer);
  if (answerToastTimer) clearTimeout(answerToastTimer);
  gameStore.disconnectFromGame();
});

// --- Solo mode: auto-skip player 2 turns ---

watch(
  [isPlayer2Turn, isSoloMode, loading],
  ([p2Turn, solo, isLoading]) => {
    if (p2Turn && solo && !isLoading && !submitting.value && !isLegFinished.value && !isMatchFinished.value) {
      // Small delay so the UI doesn't flash
      setTimeout(async () => {
        if (activePlayerIndex.value !== 1) return; // Guard against race
        submitting.value = true;
        try {
          await gameStore.handlePlayerTimeout();
        } finally {
          submitting.value = false;
          if (!isLegFinished.value && !isMatchFinished.value && hasTimer.value) {
            timerRunning.value = true;
          }
        }
      }, 100);
    }
  },
  { immediate: true },
);

// --- Error watcher ---

watch(error, (newError) => {
  if (newError) {
    errorMessage.value = newError;
    if (errorDismissTimer) clearTimeout(errorDismissTimer);
    errorDismissTimer = setTimeout(() => {
      errorMessage.value = null;
    }, 5000);
  }
});

// --- Bust notification watcher ---

watch(lastTurnResult, (result) => {
  if (result && result.result.startsWith('BUST_') && result.bustMessage) {
    bustReason.value = result.bustMessage;
    bustPlayerName.value = activePlayerName.value;
    bustVisible.value = true;
    // Auto-dismiss after BustNotification's own timeout
    setTimeout(() => {
      bustVisible.value = false;
    }, 3500);
  }
});

// --- Actions ---

const handlePlayerSelect = async (player: PlayerOption) => {
  if (isPlayerInputDisabled.value) return;

  timerRunning.value = false;
  submitting.value = true;

  // Capture the active player's score before submission
  const oldScore = activePlayerIndex.value === 0
    ? player1Score.value
    : player2Score.value;

  try {
    await gameStore.submitPlayerAnswer(player.id, player.name);

    const result = lastTurnResult.value;
    if (result) {
      if (result.result === 'DUPLICATE_PLAYER') {
        errorMessage.value = 'That player has already been used this leg.';
        if (errorDismissTimer) clearTimeout(errorDismissTimer);
        errorDismissTimer = setTimeout(() => {
          errorMessage.value = null;
        }, 3000);
      }

      // Determine new score from the latest turn entry
      const latestTurn = turns.value.length > 0
        ? turns.value[turns.value.length - 1]
        : null;
      const newScore = latestTurn?.scoreAfter ?? oldScore;

      // Show modal only for CHECKOUT; use toasts for VALID and BUST
      if (result.result === 'CHECKOUT') {
        revealData.value = {
          footballerName: player.name,
          nationality: player.nationality ?? null,
          position: player.position ?? null,
          statValue: result.statValue ?? 0,
          oldScore,
          newScore,
          turnResult: result.result,
          bustMessage: result.bustMessage,
        };
      } else {
        // Show answer toast for valid plays
        if (result.result === 'VALID') {
          if (answerToastTimer) clearTimeout(answerToastTimer);
          answerToast.value = {
            playerName: player.name,
            statValue: result.statValue ?? 0,
            scoreDiff: oldScore - newScore,
          };
          answerToastTimer = setTimeout(() => {
            answerToast.value = null;
          }, 2500);
        }
        // Resume immediately (busts handled by bust watcher)
        submitting.value = false;
        if (!isLegFinished.value && !isMatchFinished.value) {
          timerRunning.value = true;
        }
      }
    }
  } catch (err) {
    console.error('[GameView] handlePlayerSelect error:', err);
    submitting.value = false;
    if (!isLegFinished.value && !isMatchFinished.value) {
      timerRunning.value = true;
    }
  }
};

const handleRevealDismiss = () => {
  revealData.value = null;
  submitting.value = false;
  // Restart timer for next turn unless leg/match is over
  if (!isLegFinished.value && !isMatchFinished.value) {
    timerRunning.value = true;
  }
};

const handleTimeout = async () => {
  timerRunning.value = false;
  submitting.value = true;

  try {
    await gameStore.handlePlayerTimeout();
  } finally {
    submitting.value = false;
    if (!isLegFinished.value && !isMatchFinished.value) {
      timerRunning.value = true;
    }
  }
};

const handleContinue = () => {
  // Next leg -- the store should handle resetting leg state when loadGame
  // is called or via a dedicated action. For now, reload the game to get fresh state.
  if (gameId.value) {
    timerRunning.value = true;
    gameStore.loadGame(gameId.value);
  }
};

const handleRematch = () => {
  gameStore.reset();
  router.push({ name: 'home' });
};

const handleGoHome = () => {
  gameStore.reset();
  router.push({ name: 'home' });
};
</script>

<template>
  <AppLayout>
    <!-- Loading state -->
    <AppContainer v-if="loading && !status" size="sm" class="py-20 flex flex-col items-center gap-4">
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
      <p class="text-text-muted text-sm">Loading game...</p>
    </AppContainer>

    <!-- Game content -->
    <AppContainer v-else-if="status === 'playing' || status === 'finished'" size="sm" class="py-6 flex flex-col gap-4">
      <!-- Error toast -->
      <Transition
        enter-active-class="transition-all duration-200 ease-[var(--ease-out)]"
        enter-from-class="-translate-y-4 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-all duration-150 ease-[var(--ease-in)]"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-4 opacity-0"
      >
        <div
          v-if="errorMessage"
          role="alert"
          class="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4"
        >
          <div class="bg-bg-card border border-danger/40 shadow-elevated rounded-xl px-5 py-4 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span class="text-sm text-text">{{ errorMessage }}</span>
          </div>
        </div>
      </Transition>

      <!-- Opponent disconnected banner -->
      <Transition
        enter-active-class="transition-all duration-200 ease-[var(--ease-out)]"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-[var(--ease-in)]"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="!opponentConnected"
          role="status"
          class="bg-warning/10 border border-warning/30 rounded-xl px-5 py-3 flex items-center gap-3"
        >
          <svg
            class="animate-spin h-4 w-4 text-warning shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span class="text-sm font-semibold text-warning">
            Opponent disconnected. Waiting for reconnection...
          </span>
        </div>
      </Transition>

      <!-- Game header: category name -->
      <h2 class="font-display text-base font-bold text-text text-center">
        {{ categoryName }}
      </h2>

      <!-- Scoreboard (dominant) -->
      <ScoreBoard
        :player1-name="player1Name"
        :player2-name="player2Name"
        :player1-score="player1Score"
        :player2-score="player2Score"
        :active-player="activePlayerIndex"
        :leg-wins="legWins"
        :target-score="targetScore"
        :timer-duration="hasTimer ? timerDuration : 0"
        :timer-running="hasTimer && timerRunning && !isPlayerInputDisabled"
        @timeout="handleTimeout"
      />

      <!-- Near-miss checkout feedback -->
      <Transition
        enter-active-class="transition-all duration-300 ease-[var(--ease-out)]"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-200 ease-[var(--ease-in)]"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="nearMissInfo"
          class="text-center py-1"
        >
          <span
            class="inline-block text-sm font-display font-bold tracking-wide"
            :class="[nearMissInfo.colorClass, nearMissInfo.pulseClass]"
          >
            {{ nearMissInfo.message }}
          </span>
        </div>
      </Transition>

      <!-- Player search (primary action area — no card wrapper) -->
      <PlayerSearch
        :league="categoryLeague"
        :team-id="categoryTeamId"
        :stat-type="categoryStatType"
        :used-player-ids="usedPlayerIds"
        :disabled="isPlayerInputDisabled"
        @select="handlePlayerSelect"
      />
      <div v-if="submitting" class="flex items-center justify-center gap-2">
        <svg
          class="animate-spin h-4 w-4 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span class="text-sm text-text-muted">Submitting...</span>
      </div>

      <!-- Turn history (collapsible) -->
      <AppCard class="p-4">
        <h3 class="font-display text-sm font-semibold text-text-muted mb-3">Turn History</h3>
        <TurnHistory
          :turns="turns"
          :player1-name="player1Name"
          :player2-name="player2Name"
        />
      </AppCard>

      <!-- Match finished overlay -->
      <Transition
        enter-active-class="transition-opacity duration-200 ease-[var(--ease-out)]"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-[var(--ease-in)]"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isMatchFinished && !showCelebration"
          class="fixed inset-0 z-40 flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Match finished"
        >
          <div class="text-center flex flex-col items-center gap-6 px-8 py-12 max-w-sm">
            <h2 class="font-display text-3xl font-bold text-text">Match Over</h2>
            <p class="text-text-muted text-lg">
              <span class="text-primary-light font-semibold">{{ celebrationWinnerName }}</span>
              wins the match
              <span class="font-mono text-text">{{ legWins[0] }} - {{ legWins[1] }}</span>
            </p>
            <div class="flex gap-3 mt-2">
              <AppButton variant="primary" @click="handleRematch">
                Rematch
              </AppButton>
              <AppButton variant="secondary" @click="handleGoHome">
                Home
              </AppButton>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Checkout celebration -->
      <CheckoutCelebration
        :visible="showCelebration"
        :winner-name="celebrationWinnerName"
        :final-score="celebrationFinalScore"
        :is-match-win="isMatchFinished"
        :category-name="categoryName"
        :turns-taken="turns.length"
        :opponent-name="player2Name"
        :opponent-score="player2Score"
        :footballers-named="footballersNamed"
        @continue="handleContinue"
        @rematch="handleRematch"
        @home="handleGoHome"
      />

      <!-- Answer reveal overlay -->
      <AnswerReveal
        v-if="revealData"
        :footballer-name="revealData.footballerName"
        :nationality="revealData.nationality"
        :position="revealData.position"
        :stat-value="revealData.statValue"
        :old-score="revealData.oldScore"
        :new-score="revealData.newScore"
        :turn-result="revealData.turnResult"
        :bust-message="revealData.bustMessage"
        @dismiss="handleRevealDismiss"
      />

      <!-- Valid answer toast -->
      <Transition
        enter-active-class="transition-all duration-300 ease-[var(--ease-out)]"
        enter-from-class="-translate-y-full opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-all duration-200 ease-[var(--ease-in)]"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-full opacity-0"
      >
        <div
          v-if="answerToast"
          role="status"
          class="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4"
        >
          <div class="bg-bg-card border border-success/40 shadow-elevated rounded-xl px-5 py-4 flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-sm font-semibold text-success">{{ answerToast.playerName }}</span>
              <span class="text-sm text-text-muted">
                Stat: {{ answerToast.statValue }} &mdash; <span class="text-success font-mono">-{{ answerToast.scoreDiff }}</span>
              </span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Bust notification -->
      <BustNotification
        :visible="bustVisible"
        :reason="bustReason"
        :player-name="bustPlayerName"
        @dismiss="bustVisible = false"
      />
    </AppContainer>

    <!-- Error state (failed to load game) -->
    <AppContainer v-else-if="error && !status" size="sm" class="py-20 flex flex-col items-center gap-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p class="text-text text-lg font-semibold">Failed to load game</p>
      <p class="text-text-muted text-sm">{{ error }}</p>
      <AppButton variant="secondary" @click="handleGoHome">
        Back to Home
      </AppButton>
    </AppContainer>
  </AppLayout>
</template>

<style scoped>
@keyframes checkout-pulse-strong {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

@keyframes checkout-pulse-moderate {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes checkout-pulse-subtle {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.4; }
}

.animate-checkout-pulse-strong {
  animation: checkout-pulse-strong 1.2s ease-in-out infinite;
}

.animate-checkout-pulse-moderate {
  animation: checkout-pulse-moderate 1.5s ease-in-out infinite;
}

.animate-checkout-pulse-subtle {
  animation: checkout-pulse-subtle 2s ease-in-out infinite;
}
</style>
