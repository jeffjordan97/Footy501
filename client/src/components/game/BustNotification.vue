<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps<{
  visible: boolean;
  reason: string;
  playerName: string;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

const show = ref(false);
let autoHideTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.visible, (v) => {
  if (v) {
    if (autoHideTimer) clearTimeout(autoHideTimer);
    show.value = true;
    autoHideTimer = setTimeout(() => {
      show.value = false;
      autoHideTimer = null;
      emit('dismiss');
    }, 3000);
  } else {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
    }
    show.value = false;
  }
});

onUnmounted(() => {
  if (autoHideTimer) clearTimeout(autoHideTimer);
});
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-[var(--ease-out)]"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-[var(--ease-in)]"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="visible && show"
      role="alert"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4"
    >
      <div class="bg-bg-card border border-danger/40 shadow-elevated rounded-xl px-5 py-4 flex items-start gap-3">
        <!-- Icon -->
        <div class="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center shrink-0 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <!-- Content -->
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="text-sm font-semibold text-danger">Bust!</span>
          <span class="text-sm text-text-muted">{{ playerName }}: {{ reason }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>
