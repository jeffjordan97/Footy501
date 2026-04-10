<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const authStore = useAuthStore();
const { isAuthenticated, user } = storeToRefs(authStore);

const isHome = computed(() => route.path === '/');
const showDropdown = ref(false);

const isGuest = computed(() => user.value?.authProvider === 'guest');
const providerLabel = computed(() => {
  switch (user.value?.authProvider) {
    case 'google': return 'Google';
    default: return 'Guest';
  }
});

function toggleDropdown(): void {
  showDropdown.value = !showDropdown.value;
}

function closeDropdown(): void {
  showDropdown.value = false;
}

function delayedCloseDropdown(): void {
  setTimeout(closeDropdown, 150);
}

function handleLogout(): void {
  closeDropdown();
  authStore.logout();
}

function handleLinkGoogle(): void {
  closeDropdown();
  authStore.linkGoogle();
}
</script>

<template>
  <nav class="w-full px-6 py-4 flex items-center justify-between border-b border-border">
    <router-link
      to="/"
      class="font-display text-xl font-bold text-text hover:text-primary-light transition-colors duration-150 cursor-pointer"
    >
      Footy 501
    </router-link>

    <div class="flex items-center gap-3">
      <router-link
        v-if="!isHome"
        to="/"
        class="text-sm text-text-muted hover:text-text transition-colors duration-150 cursor-pointer"
      >
        Home
      </router-link>

      <!-- User profile indicator -->
      <div v-if="isAuthenticated && user" class="relative">
        <button
          class="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors duration-150 cursor-pointer rounded-lg px-2 py-1 hover:bg-bg-elevated"
          @click="toggleDropdown"
          @blur="delayedCloseDropdown"
        >
          <!-- Provider icon -->
          <svg v-if="user.authProvider === 'google'" class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span class="hidden sm:inline max-w-30 truncate">{{ user.displayName }}</span>
        </button>

        <!-- Dropdown menu -->
        <div
          v-if="showDropdown"
          class="absolute right-0 top-full mt-1 w-56 bg-bg-card border border-border rounded-lg shadow-elevated py-1 z-50"
        >
          <div class="px-3 py-2 border-b border-border">
            <p class="text-sm font-semibold text-text truncate">{{ user.displayName }}</p>
            <p class="text-xs text-text-muted">{{ providerLabel }} account</p>
          </div>

          <!-- Link options for guest users -->
          <template v-if="isGuest">
            <button
              class="w-full text-left px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-elevated transition-colors duration-150 flex items-center gap-2 cursor-pointer"
              @mousedown.prevent="handleLinkGoogle"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Link Google
            </button>
          </template>

          <button
            class="w-full text-left px-3 py-2 text-sm text-danger hover:bg-bg-elevated transition-colors duration-150 cursor-pointer"
            @mousedown.prevent="handleLogout"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
