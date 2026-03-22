<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg';
}>();
</script>

<template>
  <div
    class="w-full mx-auto px-4 sm:px-6"
    :class="{
      'max-w-lg': size === 'sm',
      'max-w-3xl': size === 'md' || !size,
      'max-w-6xl': size === 'lg',
    }"
  >
    <slot />
  </div>
</template>
