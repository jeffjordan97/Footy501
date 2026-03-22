import { ref, computed, watch, onUnmounted, type Ref } from 'vue';

export interface UseGameTimerOptions {
  readonly duration: Ref<number>;
  readonly running: Ref<boolean>;
  readonly onTimeout: () => void;
}

export function useGameTimer(options: UseGameTimerOptions) {
  const { duration, running, onTimeout } = options;

  const secondsLeft = ref(duration.value);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const percent = computed(() =>
    Math.max(0, (secondsLeft.value / duration.value) * 100),
  );

  const colorClass = computed(() => {
    if (percent.value > 50) return 'stroke-success';
    if (percent.value > 25) return 'stroke-warning';
    return 'stroke-danger';
  });

  const textColorClass = computed(() =>
    colorClass.value.replace('stroke-', 'text-'),
  );

  const isPulsing = computed(() => secondsLeft.value <= 5 && running.value);

  const stop = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const start = () => {
    stop();
    secondsLeft.value = duration.value;
    intervalId = setInterval(() => {
      secondsLeft.value -= 1;
      if (secondsLeft.value <= 0) {
        stop();
        onTimeout();
      }
    }, 1000);
  };

  const reset = (newDuration?: number) => {
    stop();
    secondsLeft.value = newDuration ?? duration.value;
  };

  watch(running, (isRunning) => {
    if (isRunning) start();
    else stop();
  });

  watch(duration, () => {
    if (running.value) start();
    else reset();
  });

  onUnmounted(stop);

  return {
    secondsLeft,
    percent,
    colorClass,
    textColorClass,
    isPulsing,
    start,
    stop,
    reset,
  };
}
