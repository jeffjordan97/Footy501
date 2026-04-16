<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getSeasons, getSeasonPlayers, type SeasonInfo, type SeasonPlayer } from '@/lib/api';

interface Props {
  league: string;
  teamId?: string;
  statType?: string;
  usedPlayerIds: ReadonlySet<string>;
  disabled?: boolean;
  maxReveals?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [player: { id: string; name: string; position: string; nationality: string }];
}>();

const seasons = ref<readonly SeasonInfo[]>([]);
const loadingSeasons = ref(false);
const selectedSeason = ref<string | null>(null);
const loadingSeason = ref<string | null>(null);
const revealedSeasons = ref<ReadonlySet<string>>(new Set());
const playerCache = ref<ReadonlyMap<string, readonly SeasonPlayer[]>>(new Map());
const expanded = ref(true);
const toastMessage = ref<string | null>(null);

let toastTimer: ReturnType<typeof setTimeout> | null = null;

const revealCount = computed(() => revealedSeasons.value.size);

const selectedPlayers = computed<readonly SeasonPlayer[] | null>(() => {
  if (selectedSeason.value === null) return null;
  return playerCache.value.get(selectedSeason.value) ?? null;
});

function formatSeasonLabel(season: string): string {
  return season;
}

function showToast(message: string): void {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = message;
  toastTimer = setTimeout(() => {
    toastMessage.value = null;
  }, 2500);
}

function isUsed(playerId: string): boolean {
  return props.usedPlayerIds.has(playerId);
}

onMounted(async () => {
  loadingSeasons.value = true;
  try {
    const result = await getSeasons(props.league, props.teamId);
    seasons.value = result.seasons;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load seasons';
    showToast(message);
  } finally {
    loadingSeasons.value = false;
  }
});

async function toggleSeason(season: string): Promise<void> {
  if (props.disabled) return;

  // If already selected, close it
  if (selectedSeason.value === season) {
    selectedSeason.value = null;
    return;
  }

  // If already cached, just select it
  if (playerCache.value.has(season)) {
    selectedSeason.value = season;
    return;
  }

  // Check maxReveals before fetching a new season
  if (props.maxReveals !== undefined && revealCount.value >= props.maxReveals) {
    showToast(`You can only reveal ${props.maxReveals} season${props.maxReveals === 1 ? '' : 's'}`);
    return;
  }

  // Fetch players for this season
  loadingSeason.value = season;
  try {
    const result = await getSeasonPlayers(season, props.league, props.teamId, props.statType);
    playerCache.value = new Map([...playerCache.value, [season, result.players]]);
    revealedSeasons.value = new Set([...revealedSeasons.value, season]);
    selectedSeason.value = season;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load players';
    showToast(message);
  } finally {
    loadingSeason.value = null;
  }
}

function handlePlayerClick(player: SeasonPlayer): void {
  if (props.disabled || isUsed(player.id)) return;
  emit('select', {
    id: player.id,
    name: player.name,
    position: player.position ?? 'Unknown',
    nationality: 'Unknown',
  });
}
</script>

<template>
  <div :class="{ 'opacity-50 pointer-events-none': disabled }">
    <button
      type="button"
      class="w-full flex items-center justify-between mb-2 cursor-pointer"
      @click="expanded = !expanded"
    >
      <h3 class="font-display text-sm font-semibold text-text-muted">Seasons</h3>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-4 h-4 text-text-muted transition-transform duration-150"
        :class="expanded ? 'rotate-180' : ''"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <template v-if="expanded">
      <!-- Loading -->
      <div v-if="loadingSeasons" class="flex items-center gap-2">
        <svg class="animate-spin h-4 w-4 text-primary shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span class="text-xs text-text-muted">Loading seasons...</span>
      </div>

      <!-- Season chips -->
      <div v-else class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="s in seasons"
        :key="s.season"
        type="button"
        class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-150 inline-flex items-center gap-1.5"
        :class="
          selectedSeason === s.season
            ? 'bg-primary/20 text-primary-light border-primary/40'
            : 'bg-bg-elevated text-text-muted border-border hover:border-primary/30'
        "
        :disabled="disabled"
        @click="toggleSeason(s.season)"
      >
        <svg v-if="loadingSeason === s.season" class="animate-spin h-3 w-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span>{{ formatSeasonLabel(s.season) }}</span>
        <span class="font-mono opacity-60">({{ s.playerCount }})</span>
      </button>
    </div>

    <!-- Player list -->
    <div v-if="selectedPlayers" class="mt-2 max-h-64 overflow-y-auto rounded-lg bg-bg-elevated border border-border">
      <button
        v-for="player in selectedPlayers"
        :key="player.id"
        type="button"
        class="w-full flex items-center justify-between px-3 py-2 text-left transition-colors duration-100 hover:bg-primary/10"
        :class="isUsed(player.id) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'"
        :disabled="disabled || isUsed(player.id)"
        @click="handlePlayerClick(player)"
      >
        <div class="flex flex-col min-w-0">
          <span class="text-sm font-medium text-text truncate">{{ player.name }}</span>
          <span class="text-xs text-text-muted">{{ player.position ?? 'Unknown' }}</span>
        </div>
        <span
          v-if="isUsed(player.id)"
          class="text-xs text-accent font-mono shrink-0 ml-2"
        >
          Used
        </span>
        <span
          v-else
          class="text-xs font-mono text-text-muted shrink-0 ml-2"
        >
          {{ player.statValue }}
        </span>
      </button>

      <div
        v-if="selectedPlayers.length === 0"
        class="px-3 py-4 text-sm text-text-muted text-center"
      >
        No players found for this season
      </div>
    </div>

    </template>

    <!-- Toast -->
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <p v-if="toastMessage" class="mt-2 text-xs text-danger text-center">{{ toastMessage }}</p>
    </Transition>
  </div>
</template>
