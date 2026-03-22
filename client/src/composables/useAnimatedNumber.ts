import { ref, watch, type Ref, type WatchSource } from 'vue';

export function useAnimatedNumber(source: WatchSource<number>, duration = 400): Ref<number> {
  const initial = typeof source === 'function' ? source() : source.value;
  const displayed = ref(initial);

  watch(source, (newVal, oldVal) => {
    if (oldVal === undefined || oldVal === newVal) {
      displayed.value = newVal;
      return;
    }

    const start = oldVal;
    const diff = newVal - start;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      displayed.value = Math.round(start + diff * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  });

  return displayed;
}
