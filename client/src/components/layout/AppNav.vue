<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isHome = computed(() => route.path === '/');
</script>

<template>
  <nav class="w-full px-6 py-4 flex items-center justify-between border-b border-border">
    <router-link
      to="/"
      class="font-display text-xl font-bold text-text hover:text-primary-light transition-colors duration-150 cursor-pointer"
    >
      Footy 501
    </router-link>

    <div v-if="!isHome" class="flex items-center gap-3">
      <router-link
        to="/"
        class="text-sm text-text-muted hover:text-text transition-colors duration-150 cursor-pointer"
      >
        Home
      </router-link>
    </div>
  </nav>
</template>
