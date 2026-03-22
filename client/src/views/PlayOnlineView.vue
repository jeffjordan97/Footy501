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
const { isAuthenticated, user, loading: authLoading } = storeToRefs(authStore);

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

      <!-- Guest auth (before authenticated) -->
      <template v-if="!isAuthenticated">
        <AppCard class="p-6 flex flex-col items-center gap-4">
          <p class="text-text-muted text-sm text-center">Enter your name to join as a guest</p>
          <AppInput
            v-model="nameInput"
            placeholder="Your name..."
            :maxlength="24"
            @keyup.enter="handleGuestLogin"
          />
          <div v-if="error" class="text-danger text-sm text-center">
            {{ error }}
          </div>
          <AppButton
            variant="primary"
            :disabled="!nameInput.trim() || authLoading"
            @click="handleGuestLogin"
          >
            {{ authLoading ? 'Joining...' : 'Join as Guest' }}
          </AppButton>
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
