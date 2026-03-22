<script setup lang="ts">
import { useCountdown, nextMidnight } from '@/composables/useCountdown';

const { timeLeft, pad } = useCountdown(nextMidnight);
</script>

<template>
  <div class="flex items-center justify-center gap-3">
    <div class="flex flex-col items-center">
      <span class="font-mono text-2xl font-bold text-text tabular-nums">{{ pad(timeLeft.hours) }}</span>
      <span class="text-[10px] text-text-muted uppercase tracking-wider">hrs</span>
    </div>
    <span class="text-xl text-text-muted font-mono">:</span>
    <div class="flex flex-col items-center">
      <span class="font-mono text-2xl font-bold text-text tabular-nums">{{ pad(timeLeft.minutes) }}</span>
      <span class="text-[10px] text-text-muted uppercase tracking-wider">min</span>
    </div>
    <span class="text-xl text-text-muted font-mono">:</span>
    <div class="flex flex-col items-center">
      <span class="font-mono text-2xl font-bold text-text tabular-nums">{{ pad(timeLeft.seconds) }}</span>
      <span class="text-[10px] text-text-muted uppercase tracking-wider">sec</span>
    </div>
  </div>
</template>
