<script setup lang="ts">
import { ref, watch } from 'vue';

export interface GamePreset {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly apply: () => void;
}

const props = defineProps<{
  presets: readonly GamePreset[];
  /** Reactive keys that, when changed, should clear the active preset */
  watchKeys?: readonly unknown[];
}>();

const activePresetId = ref<string | null>(null);

function selectPreset(preset: GamePreset): void {
  activePresetId.value = preset.id;
  preset.apply();
}

// Clear active preset when any watched setting changes externally
if (props.watchKeys) {
  watch(
    () => props.watchKeys?.map((k) => k),
    () => {
      // defer clearing so the preset's own changes don't immediately clear it
    },
    { deep: true },
  );
}

defineExpose({
  clearActive: () => {
    activePresetId.value = null;
  },
  activePresetId,
});
</script>

<template>
  <div class="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
    <button
      v-for="preset in presets"
      :key="preset.id"
      type="button"
      class="preset-chip shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 cursor-pointer select-none whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-bg-deep"
      :class="activePresetId === preset.id
        ? 'bg-primary text-white border-primary'
        : 'bg-bg-elevated text-text border-border hover:bg-bg-card hover:border-text-muted/30'"
      @click="selectPreset(preset)"
    >
      <span class="text-base leading-none" aria-hidden="true">{{ preset.icon }}</span>
      <span>{{ preset.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border, #333) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  height: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--color-border, #333);
  border-radius: 2px;
}
</style>
