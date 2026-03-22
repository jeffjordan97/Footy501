<script setup lang="ts">
import AppCard from '@/components/ui/AppCard.vue';

const gameModes = [
  {
    title: 'Local Game',
    description: 'Play against a friend on the same device',
    route: '/play/local',
    icon: 'users',
    accentClass: 'text-primary-light',
  },
  {
    title: 'Play Online',
    description: 'Challenge players around the world',
    route: '/play/online',
    icon: 'globe',
    accentClass: 'text-accent',
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
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-3xl">
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
                v-else-if="mode.icon === 'globe'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
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
