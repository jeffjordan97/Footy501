<script setup lang="ts">
import GameTimer from './GameTimer.vue';

defineProps<{
  playerName: string;
  playerIndex: 0 | 1;
  timerDuration: number;
  timerRunning: boolean;
  categoryName: string;
  legNumber: number;
  totalLegs: number;
}>();

defineEmits<{
  timeout: [];
}>();
</script>

<template>
  <div class="flex items-center justify-between gap-4 rounded-xl bg-bg-card border border-border px-5 py-4">
    <!-- Left: turn info -->
    <div class="flex flex-col gap-1 min-w-0">
      <div class="flex items-center gap-2">
        <div
          class="w-5 h-5 rounded-full text-[10px] font-display font-bold flex items-center justify-center"
          :class="playerIndex === 0
            ? 'bg-primary/20 text-primary-light'
            : 'bg-accent/20 text-accent'"
        >
          {{ playerIndex + 1 }}
        </div>
        <span class="text-base font-semibold text-text truncate">
          {{ playerName }}'s turn
        </span>
      </div>
      <div class="flex items-center gap-3 text-xs text-text-muted">
        <span>{{ categoryName }}</span>
        <span class="text-text-muted/30">|</span>
        <span>Leg {{ legNumber }} of {{ totalLegs }}</span>
      </div>
    </div>

    <!-- Right: timer -->
    <GameTimer
      :duration="timerDuration"
      :running="timerRunning"
      @timeout="$emit('timeout')"
    />
  </div>
</template>
