<script setup lang="ts">
defineProps<{
  elevated?: boolean;
  interactive?: boolean;
}>();
</script>

<template>
  <div
    class="rounded-xl border border-border transition-colors duration-150"
    :class="[
      elevated ? 'bg-bg-elevated shadow-elevated' : 'bg-bg-card shadow-card',
      interactive && 'cursor-pointer hover:border-primary/40',
    ]"
  >
    <slot />
  </div>
</template>
