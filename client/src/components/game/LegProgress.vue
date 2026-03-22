<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  matchFormat: number;
  legWins: readonly [number, number];
  currentLeg: number;
}>();

const legsToWin = computed(() => Math.ceil(props.matchFormat / 2));
</script>

<template>
  <div class="flex items-center justify-center gap-4 text-xs text-text-muted">
    <!-- Player 1 leg dots -->
    <div class="flex items-center gap-1">
      <div
        v-for="i in legsToWin"
        :key="`p1-${i}`"
        class="w-2.5 h-2.5 rounded-full transition-colors duration-200"
        :class="i <= legWins[0] ? 'bg-primary' : 'bg-bg-elevated border border-border'"
      />
    </div>

    <span class="font-mono tabular-nums">
      {{ legWins[0] }} - {{ legWins[1] }}
    </span>

    <!-- Player 2 leg dots -->
    <div class="flex items-center gap-1">
      <div
        v-for="i in legsToWin"
        :key="`p2-${i}`"
        class="w-2.5 h-2.5 rounded-full transition-colors duration-200"
        :class="i <= legWins[1] ? 'bg-accent' : 'bg-bg-elevated border border-border'"
      />
    </div>
  </div>
</template>
