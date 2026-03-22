import { ref, onMounted, onUnmounted } from 'vue';

export interface CountdownTime {
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

export function useCountdown(targetFn: () => Date) {
  const timeLeft = ref<CountdownTime>({ hours: 0, minutes: 0, seconds: 0 });
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const update = () => {
    const now = new Date();
    const target = targetFn();
    const diff = Math.max(0, target.getTime() - now.getTime());

    timeLeft.value = {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  };

  onMounted(() => {
    update();
    intervalId = setInterval(update, 1000);
  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    timeLeft,
    pad,
  };
}

export function nextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}
