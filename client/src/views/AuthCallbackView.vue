<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { API_BASE } from '@/lib/api';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

onMounted(async () => {
  const code = route.query.code as string | undefined;
  const error = route.query.error as string | undefined;

  if (error) {
    console.error('OAuth error:', error);
    router.replace('/');
    return;
  }

  if (code) {
    try {
      // Exchange the short-lived code for a JWT via POST
      const response = await fetch(`${API_BASE}/auth/token-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();
        authStore.handleOAuthCallback(data.token);
        await authStore.loadUser();
      }
    } catch {
      // Exchange failed — redirect home
    }
  }

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
