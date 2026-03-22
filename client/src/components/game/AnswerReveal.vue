<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';

const props = defineProps<{
  footballerName: string;
  nationality?: string | null;
  position?: string | null;
  statValue: number;
  oldScore: number;
  newScore: number;
  turnResult: string;
  bustMessage?: string | null;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

const show = ref(false);
const animatedStat = ref(0);
let autoHideTimer: ReturnType<typeof setTimeout> | null = null;
let animationFrameId: number | null = null;

const isBust = computed(() => props.turnResult.startsWith('BUST_'));
const isCheckout = computed(() => props.turnResult === 'CHECKOUT');
const isDuplicate = computed(() => props.turnResult === 'DUPLICATE_PLAYER');
const isValid = computed(() => props.turnResult === 'VALID');

const badgeText = computed(() => {
  switch (props.turnResult) {
    case 'VALID': {
      const diff = props.oldScore - props.newScore;
      return `-${diff}`;
    }
    case 'BUST_OVER_180':
      return 'BUST! Over 180';
    case 'BUST_IMPOSSIBLE_SCORE':
      return 'BUST! Impossible Score';
    case 'BUST_BELOW_CHECKOUT':
      return 'BUST! Below Checkout';
    case 'BUST_BOGEY_NUMBER':
      return 'BUST! Bogey Number';
    case 'CHECKOUT':
      return 'CHECKOUT!';
    case 'DUPLICATE_PLAYER':
      return 'Already Used!';
    default:
      return props.bustMessage ?? props.turnResult;
  }
});

const badgeClass = computed(() => {
  if (isCheckout.value) return 'bg-warning/20 text-warning border-warning/40';
  if (isBust.value) return 'bg-danger/20 text-danger border-danger/40';
  if (isDuplicate.value) return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  return 'bg-success/20 text-success border-success/40';
});

const overlayAccentClass = computed(() => {
  if (isCheckout.value) return 'ring-2 ring-warning/30';
  if (isBust.value) return 'ring-2 ring-danger/30 animate-shake';
  return '';
});

const metaText = computed(() => {
  const parts: string[] = [];
  if (props.position) parts.push(props.position);
  if (props.nationality) parts.push(props.nationality);
  return parts.join(' / ');
});

function animateStatValue() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  animatedStat.value = 0;
  const target = props.statValue;
  const duration = 1000;
  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    animatedStat.value = Math.round(target * eased);

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(step);
    } else {
      animationFrameId = null;
    }
  }

  animationFrameId = requestAnimationFrame(step);
}

function cleanup() {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function dismiss() {
  cleanup();
  show.value = false;
  emit('dismiss');
}

watch(
  () => props.footballerName,
  () => {
    cleanup();
    show.value = true;
    animateStatValue();
    autoHideTimer = setTimeout(() => {
      dismiss();
    }, 2500);
  },
  { immediate: true },
);

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-[var(--ease-out)]"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-150 ease-[var(--ease-in)]"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-label="`Answer reveal: ${footballerName}`"
      @click="dismiss"
    >
      <div
        class="relative bg-bg-card border border-border shadow-elevated rounded-2xl px-8 py-7 max-w-sm w-full mx-4 flex flex-col items-center gap-4"
        :class="overlayAccentClass"
        @click.stop="dismiss"
      >
        <!-- Footballer name -->
        <h2 class="font-display text-2xl font-bold text-text text-center leading-tight">
          {{ footballerName }}
        </h2>

        <!-- Position / Nationality -->
        <p v-if="metaText" class="text-sm text-text-muted text-center -mt-2">
          {{ metaText }}
        </p>

        <!-- Stat value with counting animation -->
        <div class="flex flex-col items-center gap-1">
          <span class="text-xs font-mono uppercase tracking-wider text-text-muted">Stat Value</span>
          <span
            class="font-mono font-bold text-5xl tabular-nums leading-none"
            :class="[
              isValid ? 'animate-flash-green' : '',
              isCheckout ? 'text-warning' : 'text-text',
            ]"
          >
            {{ animatedStat }}
          </span>
        </div>

        <!-- Score deduction visualization -->
        <div class="flex items-center gap-3 text-lg font-mono tabular-nums">
          <span class="text-text-muted">{{ oldScore }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <span
            class="font-bold"
            :class="isBust ? 'text-danger' : isCheckout ? 'text-warning' : 'text-text'"
          >
            {{ newScore }}
          </span>
        </div>

        <!-- Result badge -->
        <span
          class="inline-block px-4 py-1.5 rounded-full text-sm font-semibold border"
          :class="badgeClass"
        >
          {{ badgeText }}
        </span>

        <!-- Tap hint -->
        <p class="text-xs text-text-muted/60 mt-1">Tap to continue</p>

        <!-- Checkout sparkle overlay -->
        <div
          v-if="isCheckout"
          class="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
          aria-hidden="true"
        >
          <div
            v-for="i in 8"
            :key="i"
            class="absolute w-1.5 h-1.5 rounded-full bg-warning animate-sparkle"
            :style="{
              left: `${10 + (i * 11)}%`,
              top: `${5 + ((i % 3) * 35)}%`,
              animationDelay: `${i * 0.12}s`,
            }"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes flash-green {
  0% { color: var(--color-success, #22c55e); }
  100% { color: var(--color-text, #e2e8f0); }
}

.animate-flash-green {
  animation: flash-green 0.8s ease-out 1s both;
  color: var(--color-success, #22c55e);
}

@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1.5); }
}

.animate-sparkle {
  animation: sparkle 1.2s ease-in-out infinite;
}
</style>
