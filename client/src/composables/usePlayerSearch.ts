import { ref, watch, type Ref } from 'vue';
import { searchPlayersInCategory, type PlayerWithStat } from '@/lib/api';

export interface SearchablePlayer {
  readonly id: string;
  readonly name: string;
  readonly position: string;
  readonly nationality: string;
}

export interface UsePlayerSearchOptions {
  readonly league: Ref<string>;
  readonly teamId: Ref<string | undefined>;
  readonly statType: Ref<string | undefined>;
  readonly usedPlayerIds: Ref<ReadonlySet<string>>;
  readonly maxResults?: number;
  readonly debounceMs?: number;
}

export function usePlayerSearch(options: UsePlayerSearchOptions) {
  const {
    league,
    teamId,
    statType,
    usedPlayerIds,
    maxResults = 15,
    debounceMs = 250,
  } = options;

  const inputValue = ref('');
  const filteredPlayers = ref<SearchablePlayer[]>([]);
  const searching = ref(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;

  async function search(query: string): Promise<void> {
    if (!query.trim() || !league.value) {
      filteredPlayers.value = [];
      return;
    }

    if (abortController) abortController.abort();
    abortController = new AbortController();

    searching.value = true;
    try {
      const response = await searchPlayersInCategory(
        query,
        league.value,
        teamId.value,
        statType.value,
        maxResults,
      );
      filteredPlayers.value = response.players.map((p: PlayerWithStat) => ({
        id: p.id,
        name: p.name,
        position: p.position ?? 'Unknown',
        nationality: p.nationality ?? 'Unknown',
      }));
    } catch {
      // Ignore aborted requests
    } finally {
      searching.value = false;
    }
  }

  watch(inputValue, (query) => {
    if (debounceTimer) clearTimeout(debounceTimer);

    if (!query.trim()) {
      filteredPlayers.value = [];
      return;
    }

    debounceTimer = setTimeout(() => {
      search(query);
    }, debounceMs);
  });

  const isUsed = (id: string) => usedPlayerIds.value.has(id);

  const clearInput = () => {
    inputValue.value = '';
    filteredPlayers.value = [];
  };

  return {
    inputValue,
    filteredPlayers,
    searching,
    isUsed,
    clearInput,
  };
}
