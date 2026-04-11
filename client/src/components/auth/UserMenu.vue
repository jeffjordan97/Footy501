<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const { isAuthenticated, user, isGuest, providers } = storeToRefs(authStore);

const showMenu = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

const initial = computed(() => {
  const name = user.value?.displayName ?? '';
  return name.charAt(0).toUpperCase() || '?';
});

const providerLabel = computed(() => {
  switch (user.value?.authProvider) {
    case 'google': return 'Google account';
    default: return 'Guest account';
  }
});

// Close menu when clicking outside — added/removed dynamically
function onDocumentClick(e: MouseEvent): void {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    showMenu.value = false;
  }
}

watch(showMenu, (open) => {
  if (open) {
    // Defer so the current click (that opened the menu) doesn't immediately close it
    setTimeout(() => document.addEventListener('click', onDocumentClick), 0);
  } else {
    document.removeEventListener('click', onDocumentClick);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});

function toggle(): void {
  showMenu.value = !showMenu.value;
}

function goToAccount(): void {
  showMenu.value = false;
  router.push({ name: 'account' });
}

function handleLinkGoogle(): void {
  showMenu.value = false;
  authStore.linkGoogle();
}

function handleLogout(): void {
  showMenu.value = false;
  authStore.logout();
  router.push({ name: 'home' });
}

onMounted(() => {
  authStore.fetchProviders();
  if (authStore.token && !authStore.user) {
    authStore.loadUser();
  }
});
</script>

<template>
  <div ref="wrapperRef" class="relative">
    <!-- Signed in: avatar button -->
    <template v-if="isAuthenticated && user">
      <button
        class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-muted hover:text-text hover:bg-bg-elevated transition-colors duration-150 cursor-pointer"
        @click="toggle"
      >
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold"
          :class="isGuest ? 'bg-bg-elevated text-text-muted border border-border' : 'bg-primary/20 text-primary-light'"
        >
          {{ initial }}
        </div>
        <span class="hidden sm:inline max-w-28 truncate">{{ user.displayName }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 transition-transform duration-150" :class="showMenu ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <!-- Dropdown -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showMenu"
          class="absolute right-0 top-full mt-1.5 w-56 bg-bg-card border border-border rounded-lg shadow-elevated py-1 z-50 origin-top-right"
        >
          <!-- Header -->
          <div class="px-3 py-2.5 border-b border-border">
            <p class="text-sm font-semibold text-text truncate">{{ user.displayName }}</p>
            <p class="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
              <svg v-if="user.authProvider === 'google'" class="w-3 h-3 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <svg v-else class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {{ providerLabel }}
            </p>
          </div>

          <!-- Actions -->
          <button
            class="w-full text-left px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-elevated transition-colors duration-150 flex items-center gap-2 cursor-pointer"
            @click="goToAccount"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Account Settings
          </button>

          <!-- Link Google (guests only) -->
          <button
            v-if="isGuest && providers.google"
            class="w-full text-left px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-elevated transition-colors duration-150 flex items-center gap-2 cursor-pointer"
            @click="handleLinkGoogle"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Link Google Account
          </button>

          <div class="border-t border-border my-1" />

          <button
            class="w-full text-left px-3 py-2 text-sm text-danger hover:bg-bg-elevated transition-colors duration-150 cursor-pointer"
            @click="handleLogout"
          >
            Sign out
          </button>
        </div>
      </Transition>
    </template>

    <!-- Not signed in: sign in button -->
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
</template>
