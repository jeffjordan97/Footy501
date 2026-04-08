<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useSocket } from '@/composables/useSocket';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppContainer from '@/components/layout/AppContainer.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppInput from '@/components/ui/AppInput.vue';
import GameConfig from '@/components/lobby/GameConfig.vue';
import type { RoomConfig, RoomDetail } from '@/types/socket-events';

const router = useRouter();
const authStore = useAuthStore();
const { isAuthenticated, user, loading: authLoading, providers } = storeToRefs(authStore);

const {
  isConnected,
  connect,
  disconnect,
  createRoom,
  joinRoom,
  leaveRoom,
  joinMatchmaking,
  leaveMatchmaking,
  onRoomUpdated,
  onRoomClosed,
  onRoomGameStarting,
  onMatchmakingMatched,
  onMatchmakingError,
} = useSocket();

// --- Local UI state ---

type LobbyTab = 'quick-match' | 'create-room' | 'join-room';
const activeTab = ref<LobbyTab>('quick-match');
const nameInput = ref('');
const joinCode = ref('');
const error = ref<string | null>(null);

// Quick match state
const isSearching = ref(false);

// Create room state
const currentRoom = ref<RoomDetail | null>(null);
const gameConfigRef = ref<InstanceType<typeof GameConfig> | null>(null);

const isJoinCodeValid = computed(() =>
  /^[A-Z0-9]{4,8}$/i.test(joinCode.value.trim()),
);

const displayName = computed(() => user.value?.displayName ?? '');

// --- Auth ---

const handleGuestLogin = async () => {
  const name = nameInput.value.trim();
  if (!name) return;

  error.value = null;
  try {
    await authStore.loginAsGuest(name);
    connectWithAuth();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to join';
  }
};

function connectWithAuth(): void {
  if (!authStore.token) return;
  connect(authStore.token);
}

// --- Quick Match ---

const defaultConfig: RoomConfig = {
  targetScore: 501,
  matchFormat: 3,
  timerDuration: 45,
  enableBogeyNumbers: false,
  categoryId: '',
  categoryName: '',
  league: '',
  statType: '',
};

function getConfigFromRef(): RoomConfig {
  const cfg = gameConfigRef.value?.config;
  if (!cfg || !cfg.category) return defaultConfig;
  return {
    targetScore: cfg.targetScore,
    matchFormat: cfg.matchFormat,
    timerDuration: cfg.timerDuration,
    enableBogeyNumbers: cfg.enableBogeyNumbers,
    categoryId: cfg.category.id,
    categoryName: cfg.category.name,
    league: cfg.category.league,
    teamId: cfg.category.teamId ?? undefined,
    statType: cfg.category.statType,
  };
}

const handleFindMatch = async () => {
  error.value = null;
  isSearching.value = true;
  try {
    const result = await joinMatchmaking(displayName.value, defaultConfig);
    if (!result.success) {
      isSearching.value = false;
      error.value = 'Failed to join matchmaking queue';
    }
  } catch {
    isSearching.value = false;
    error.value = 'Failed to join matchmaking queue';
  }
};

const handleCancelSearch = async () => {
  await leaveMatchmaking();
  isSearching.value = false;
};

// --- Create Room ---

const handleCreateRoom = async () => {
  error.value = null;
  const config = getConfigFromRef();
  if (!config.categoryId) {
    error.value = 'Please select a stat category';
    return;
  }
  try {
    const result = await createRoom(displayName.value, config);
    if (result.success && result.room) {
      currentRoom.value = result.room;
    } else {
      error.value = result.error ?? 'Failed to create room';
    }
  } catch {
    error.value = 'Failed to create room';
  }
};

// --- Join Room ---

const handleJoinRoom = async () => {
  error.value = null;
  const code = joinCode.value.trim().toUpperCase();
  try {
    const result = await joinRoom(code, displayName.value);
    if (result.success && result.gameId) {
      navigateToGame(result.gameId);
    } else if (result.success && result.room) {
      // Joined room, waiting for game to start
      currentRoom.value = result.room;
      activeTab.value = 'create-room';
    } else {
      error.value = result.error ?? 'Room not found or full';
    }
  } catch {
    error.value = 'Failed to join room';
  }
};

// --- Navigation ---

function navigateToGame(gameId: string): void {
  router.push({ name: 'game', params: { id: gameId }, query: { mode: 'online' } });
}

// --- Socket event handlers ---

onRoomUpdated((data) => {
  currentRoom.value = data.room;
});

onRoomClosed((data) => {
  currentRoom.value = null;
  error.value = `Room closed: ${data.reason}`;
});

onRoomGameStarting((data) => {
  navigateToGame(data.gameId);
});

onMatchmakingMatched((data) => {
  isSearching.value = false;
  navigateToGame(data.gameId);
});

onMatchmakingError((data) => {
  isSearching.value = false;
  error.value = data.message;
});

// --- Lifecycle ---

onMounted(async () => {
  authStore.fetchProviders();
  if (authStore.token && !authStore.user) {
    await authStore.loadUser();
  }
  if (isAuthenticated.value) {
    connectWithAuth();
  }
});

onUnmounted(() => {
  if (currentRoom.value) {
    leaveRoom(currentRoom.value.code);
  }
  if (isSearching.value) {
    leaveMatchmaking();
  }
  disconnect();
});
</script>

<template>
  <AppLayout>
    <AppContainer size="sm" class="py-12 flex flex-col gap-8">
      <div class="text-center">
        <h1 class="font-display text-3xl mb-2">Play Online</h1>
        <p class="text-text-muted text-sm">Challenge players around the world</p>
      </div>

      <!-- Auth (before authenticated) -->
      <template v-if="!isAuthenticated">
        <AppCard class="p-6 flex flex-col items-center gap-5">
          <p class="text-text-muted text-sm text-center">Sign in to play online</p>

          <!-- OAuth providers -->
          <div v-if="providers.google" class="flex flex-col gap-3 w-full max-w-xs">
            <button
              v-if="providers.google"
              class="flex items-center justify-center gap-3 w-full px-5 py-2.5 rounded-lg bg-white text-[#3c4043] font-semibold text-sm border border-[#dadce0] hover:bg-[#f8f9fa] transition-colors duration-150 cursor-pointer"
              @click="authStore.loginWithGoogle()"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </div>

          <!-- Divider -->
          <div v-if="providers.google && providers.guest" class="flex items-center gap-3 w-full max-w-xs">
            <div class="flex-1 h-px bg-border" />
            <span class="text-text-muted text-xs">or play as guest</span>
            <div class="flex-1 h-px bg-border" />
          </div>

          <!-- Guest login -->
          <template v-if="providers.guest">
            <AppInput
              v-model="nameInput"
              placeholder="Your name..."
              :maxlength="24"
              class="w-full max-w-xs"
              @keyup.enter="handleGuestLogin"
            />
            <div v-if="error" class="text-danger text-sm text-center">
              {{ error }}
            </div>
            <AppButton
              variant="secondary"
              :disabled="!nameInput.trim() || authLoading"
              @click="handleGuestLogin"
            >
              {{ authLoading ? 'Joining...' : 'Join as Guest' }}
            </AppButton>
          </template>
        </AppCard>
      </template>

      <!-- Lobby (after authenticated) -->
      <template v-else>
        <!-- Connection status -->
        <div class="flex items-center justify-center gap-2 text-sm">
          <div
            class="w-2 h-2 rounded-full"
            :class="isConnected ? 'bg-success' : 'bg-danger animate-pulse'"
          />
          <span class="text-text-muted">
            {{ isConnected ? `Connected as ${displayName}` : 'Connecting...' }}
          </span>
        </div>

        <!-- Error -->
        <div v-if="error" class="text-danger text-sm text-center">
          {{ error }}
        </div>

        <!-- Tabs -->
        <div class="flex rounded-lg bg-bg-elevated p-1 gap-1">
          <button
            v-for="tab in ([
              { key: 'quick-match' as const, label: 'Quick Match' },
              { key: 'create-room' as const, label: 'Create Room' },
              { key: 'join-room' as const, label: 'Join Room' },
            ])"
            :key="tab.key"
            class="flex-1 text-sm font-medium py-2 px-3 rounded-md transition-all duration-150 cursor-pointer"
            :class="activeTab === tab.key
              ? 'bg-primary text-white shadow-card'
              : 'text-text-muted hover:text-text'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Quick Match -->
        <template v-if="activeTab === 'quick-match'">
          <AppCard class="p-6 flex flex-col items-center gap-6">
            <template v-if="!isSearching">
              <p class="text-text-muted text-sm text-center">
                Find a random opponent and start playing immediately
              </p>
              <AppButton variant="primary" size="lg" @click="handleFindMatch">
                Find Match
              </AppButton>
            </template>
            <template v-else>
              <div class="flex flex-col items-center gap-4 py-4">
                <div class="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p class="text-text-muted text-sm">Searching for opponent...</p>
                <AppButton variant="ghost" size="sm" @click="handleCancelSearch">
                  Cancel
                </AppButton>
              </div>
            </template>
          </AppCard>
        </template>

        <!-- Create Room -->
        <template v-if="activeTab === 'create-room'">
          <AppCard class="p-6 flex flex-col gap-6">
            <template v-if="currentRoom">
              <div class="flex flex-col items-center gap-4">
                <div class="bg-bg-elevated rounded-lg px-6 py-4 text-center">
                  <p class="text-xs text-text-muted mb-1">Room Code</p>
                  <p class="font-mono text-2xl text-primary-light tracking-widest">
                    {{ currentRoom.code }}
                  </p>
                </div>
                <div class="flex flex-col items-center gap-2">
                  <div class="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p class="text-text-muted text-xs">
                    {{ currentRoom.guestName ? `${currentRoom.guestName} joined - starting game...` : 'Waiting for opponent to join...' }}
                  </p>
                </div>
              </div>
            </template>
            <template v-else>
              <p class="text-text-muted text-sm text-center">
                Create a private room and share the code with a friend
              </p>
              <GameConfig ref="gameConfigRef" />
              <AppButton variant="primary" full-width @click="handleCreateRoom">
                Create Room
              </AppButton>
            </template>
          </AppCard>
        </template>

        <!-- Join Room -->
        <template v-if="activeTab === 'join-room'">
          <AppCard class="p-6 flex flex-col gap-4">
            <p class="text-text-muted text-sm text-center">
              Enter a room code to join a friend's game
            </p>
            <AppInput
              v-model="joinCode"
              label="Room Code"
              placeholder="Enter code..."
              :maxlength="8"
              @keyup.enter="isJoinCodeValid && handleJoinRoom()"
            />
            <AppButton
              variant="primary"
              full-width
              :disabled="!isJoinCodeValid"
              @click="handleJoinRoom"
            >
              Join Room
            </AppButton>
          </AppCard>
        </template>
      </template>
    </AppContainer>
  </AppLayout>
</template>
