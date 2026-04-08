<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

onMounted(async () => {
  const token = route.query.token as string | undefined;

  if (token) {
    authStore.handleOAuthCallback(token);
    await authStore.loadUser();
  }

  // Redirect to home or back to where they came from
  router.replace('/');
});
</script>

<template>
  <div class="min-h-dvh bg-bg-deep text-text flex items-center justify-center">
    <div class="text-center">
      <div class="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
      <p class="text-text-muted">Signing you in...</p>
    </div>
  </div>
</template>
