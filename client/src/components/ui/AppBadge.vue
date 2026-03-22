<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'muted';
}>();
</script>

<template>
  <span
    class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold font-mono"
    :class="{
      'bg-primary/20 text-primary-light': !variant || variant === 'default',
      'bg-success/20 text-success': variant === 'success',
      'bg-danger/20 text-danger': variant === 'danger',
      'bg-warning/20 text-warning': variant === 'warning',
      'bg-bg-elevated text-text-muted': variant === 'muted',
    }"
  >
    <slot />
  </span>
</template>
