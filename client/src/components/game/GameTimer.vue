<script setup lang="ts">
import { toRef } from 'vue';
import { Progress } from '@ark-ui/vue/progress';
import { useGameTimer } from '@/composables/useGameTimer';

const props = defineProps<{
  duration: number;
  running: boolean;
}>();

const emit = defineEmits<{
  timeout: [];
}>();

const { secondsLeft, percent, colorClass, textColorClass, isPulsing, reset } =
  useGameTimer({
    duration: toRef(() => props.duration),
    running: toRef(() => props.running),
    onTimeout: () => emit('timeout'),
  });

defineExpose({ resetTimer: reset, secondsLeft });
</script>

<template>
  <div
    class="relative inline-flex items-center justify-center"
    :class="isPulsing ? 'animate-pulse' : ''"
  >
    <Progress.Root :value="percent" :min="0" :max="100">
      <Progress.Circle class="w-20 h-20">
        <Progress.CircleTrack
          class="stroke-bg-elevated"
          stroke-width="4"
        />
        <Progress.CircleRange
          :class="colorClass"
          stroke-width="4"
          stroke-linecap="round"
        />
      </Progress.Circle>
    </Progress.Root>
    <span
      class="absolute inset-0 flex items-center justify-center font-mono text-lg font-medium tabular-nums"
      :class="textColorClass"
      :aria-live="isPulsing ? 'assertive' : 'polite'"
    >
      {{ secondsLeft }}
    </span>
  </div>
</template>
