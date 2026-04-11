<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import AppCard from '@/components/ui/AppCard.vue';

const authStore = useAuthStore();
const { isAuthenticated, user } = storeToRefs(authStore);

onMounted(() => {
  if (authStore.token && !authStore.user) {
    authStore.loadUser();
  }
  authStore.fetchProviders();
});

const gameModes = [
  {
    title: 'Local Game',
    description: 'Play against a friend on the same device',
    route: '/play/local',
    icon: 'users',
    accentClass: 'text-primary-light',
  },
  {
    title: 'Daily Challenge',
    description: 'One category, one chance — compete on the leaderboard',
    route: '/play/daily',
    icon: 'calendar',
    accentClass: 'text-warning',
  },
  {
    title: 'Solo Practice',
    description: 'Practice at your own pace with no timer pressure',
    route: '/play/solo',
    icon: 'target',
    accentClass: 'text-text-muted',
  },
] as const;
</script>

<template>
  <div class="min-h-dvh bg-bg-deep text-text flex flex-col relative overflow-hidden">
    <!-- Subtle pitch centre circle background -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
      <svg class="w-120 h-120 opacity-[0.04]" viewBox="0 0 480 480" fill="none">
        <circle cx="240" cy="240" r="200" stroke="currentColor" stroke-width="2" />
        <circle cx="240" cy="240" r="6" fill="currentColor" />
        <line x1="0" y1="240" x2="480" y2="240" stroke="currentColor" stroke-width="1.5" stroke-dasharray="8 6" />
      </svg>
    </div>

    <!-- Top bar -->
    <div class="relative z-10 flex justify-end px-6 pt-4">
      <template v-if="isAuthenticated && user">
        <span class="text-sm text-text-muted">{{ user.displayName }}</span>
      </template>
      <button
        v-else
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-text-muted hover:text-text bg-bg-elevated/60 hover:bg-bg-elevated border border-border/50 transition-colors duration-150 cursor-pointer"
        @click="authStore.loginWithGoogle()"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Sign in
      </button>
    </div>

    <!-- Content -->
    <div class="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
      <!-- Hero -->
      <div class="text-center mb-10">
        <h1 class="font-display text-6xl sm:text-7xl font-bold mb-3 text-text">
          Footy 501
        </h1>
        <p class="text-text-muted text-base font-body">
          Name a footballer. Score their stats. Reach zero.
        </p>
      </div>

      <!-- Game mode cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        <router-link
          v-for="mode in gameModes"
          :key="mode.route"
          :to="mode.route"
          class="group no-underline"
        >
          <AppCard interactive class="p-6 h-full flex flex-col items-center text-center gap-3">
            <!-- Icon -->
            <div
              class="w-12 h-12 rounded-lg bg-bg-elevated flex items-center justify-center transition-colors duration-150"
              :class="mode.accentClass"
            >
              <svg
                v-if="mode.icon === 'users'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <svg
                v-else-if="mode.icon === 'calendar'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <svg
                v-else-if="mode.icon === 'target'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="12" cy="12" r="5" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
              </svg>
            </div>

            <!-- Text -->
            <h2 class="font-display text-lg font-semibold" :class="mode.accentClass">
              {{ mode.title }}
            </h2>
            <p class="text-text-muted text-sm leading-relaxed">
              {{ mode.description }}
            </p>
          </AppCard>
        </router-link>
      </div>
    </div>

    <!-- Footer -->
    <footer class="relative z-10 text-center py-6 text-text-muted text-xs">
      Darts meets football trivia
    </footer>
  </div>
</template>
