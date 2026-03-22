<script setup lang="ts">
import { computed } from 'vue';
import { useAnimatedNumber } from '@/composables/useAnimatedNumber';

const props = defineProps<{
  playerName: string;
  playerNumber: 1 | 2;
  score: number;
  isActive: boolean;
  legWins: number;
  targetScore: number;
}>();

const displayedScore = useAnimatedNumber(() => props.score, 600);

const progress = computed(() =>
  Math.max(0, ((props.targetScore - props.score) / props.targetScore) * 100),
);

const isPlayer1 = computed(() => props.playerNumber === 1);
</script>

<template>
  <div
    class="rounded-xl border-l-4 border border-border bg-bg-card px-4 py-4 transition-all duration-200 flex flex-col items-center gap-2"
    :class="isActive
      ? isPlayer1
        ? 'border-l-primary-light'
        : 'border-l-accent'
      : 'border-l-transparent opacity-60'"
  >
    <div class="flex items-center gap-2">
      <div
        class="w-6 h-6 rounded-full text-xs font-display font-bold flex items-center justify-center"
        :class="isPlayer1
          ? 'bg-primary/20 text-primary-light'
          : 'bg-accent/20 text-accent'"
      >
        {{ playerNumber }}
      </div>
      <span class="text-sm font-medium text-text-muted truncate max-w-24">{{ playerName }}</span>
    </div>

    <span
      class="font-mono font-bold text-5xl tabular-nums leading-none transition-colors duration-150"
      :class="isActive ? 'text-text' : 'text-text-muted'"
      :aria-label="`${playerName} score: ${score}`"
    >
      {{ displayedScore }}
    </span>

    <!-- Progress bar with pitch-line markers -->
    <div class="w-full relative">
      <div class="w-full h-1 bg-bg-elevated rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="isPlayer1 ? 'bg-primary' : 'bg-accent'"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <!-- Quarter markers -->
      <div class="absolute inset-x-0 top-0 h-1 flex justify-between pointer-events-none px-[25%]" aria-hidden="true">
        <div class="w-px h-full bg-text/10" />
        <div class="w-px h-full bg-text/10" />
      </div>
    </div>

    <!-- Leg wins -->
    <span class="text-xs font-mono text-text-muted">
      Legs: {{ legWins }}
    </span>
  </div>
</template>
