<script setup lang="ts">
import AppNav from './AppNav.vue';

defineProps<{
  hideNav?: boolean;
}>();
</script>

<template>
  <div class="min-h-dvh bg-bg-deep text-text flex flex-col">
    <AppNav v-if="!hideNav" />
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
  </div>
</template>
