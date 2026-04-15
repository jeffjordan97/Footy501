<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import ShareableResult, { type ShareTurn } from '@/components/game/ShareableResult.vue';

const props = withDefaults(
  defineProps<{
    visible: boolean;
    winnerName: string;
    finalScore: number;
    isMatchWin: boolean;
    categoryName?: string;
    targetScore?: number;
    turnsTaken?: number;
    opponentName?: string;
    opponentScore?: number;
    footballersNamed?: string[];
    turns?: readonly ShareTurn[];
    player1Name?: string;
    player2Name?: string;
    isDaily?: boolean;
    date?: string;
  }>(),
  {
    categoryName: '',
    targetScore: 501,
    turnsTaken: 0,
    footballersNamed: () => [],
    isDaily: false,
  },
);

defineEmits<{
  continue: [];
  rematch: [];
  home: [];
}>();

const showShareCard = ref(false);

// Particle confetti system (reduced to 15 for minimalism)
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
}

const particles = ref<Particle[]>([]);
let particleCounter = 0;

const colors = ['#15803D', '#22C55E', '#D97706', '#F59E0B', '#E2E8F0'];

const generateParticles = () => {
  particles.value = Array.from({ length: 15 }, () => {
    particleCounter += 1;
    return {
      id: particleCounter,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 4,
      delay: Math.random() * 0.4,
    };
  });
};

watch(() => props.visible, (v) => {
  if (v) generateParticles();
  else particles.value = [];
});

onUnmounted(() => {
  particles.value = [];
});
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300 ease-[var(--ease-out)]"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-[var(--ease-in)]"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      :aria-label="`${winnerName} wins`"
    >
      <!-- Confetti particles -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          v-for="p in particles"
          :key="p.id"
          class="absolute rounded-full animate-confetti"
          :style="{
            left: `${p.x}%`,
            top: `-${p.size}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }"
        />
      </div>

      <!-- Content -->
      <div class="relative z-10 text-center flex flex-col items-center gap-6 px-8 py-12 max-w-sm my-auto">
        <!-- Trophy icon -->
        <div class="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.27.308 6.023 6.023 0 01-2.27-.308" />
          </svg>
        </div>

        <div>
          <h2 class="font-display text-4xl font-bold text-text mb-2">
            {{ isMatchWin ? 'Match Won!' : 'Leg Won!' }}
          </h2>
          <p class="text-text-muted text-lg">
            <span class="text-warning font-semibold">{{ winnerName }}</span>
            checks out at <span class="font-mono text-text">{{ finalScore }}</span>
          </p>
        </div>

        <div class="flex gap-3 mt-2">
          <AppButton
            v-if="!isMatchWin"
            variant="primary"
            @click="$emit('continue')"
          >
            Next Leg
          </AppButton>
          <AppButton
            variant="ghost"
            size="sm"
            @click="showShareCard = !showShareCard"
          >
            {{ showShareCard ? 'Hide' : 'Share Result' }}
          </AppButton>
          <AppButton
            :variant="isMatchWin ? 'primary' : 'secondary'"
            @click="$emit('rematch')"
          >
            {{ isMatchWin ? 'Rematch' : 'Back to Menu' }}
          </AppButton>
          <AppButton
            v-if="isMatchWin"
            variant="secondary"
            @click="$emit('home')"
          >
            Home
          </AppButton>
        </div>

        <!-- Shareable result card -->
        <Transition
          enter-active-class="transition-all duration-200 ease-[var(--ease-out)]"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-150 ease-[var(--ease-in)]"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <ShareableResult
            v-if="showShareCard && categoryName"
            :category-name="categoryName"
            :target-score="targetScore"
            :final-score="finalScore"
            :turns-taken="turnsTaken"
            :is-winner="finalScore >= -10 && finalScore <= 0"
            :turns="turns"
            :player1-name="player1Name"
            :player2-name="player2Name"
            :opponent-name="opponentName"
            :opponent-score="opponentScore"
            :footballers-named="footballersNamed"
            :is-daily="isDaily"
            :date="date"
          />
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

.animate-confetti {
  animation: confetti-fall 1.5s ease-in forwards;
}
</style>
