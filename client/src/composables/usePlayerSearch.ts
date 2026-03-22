import { ref, computed, type Ref } from 'vue';
import Fuse from 'fuse.js';

export interface SearchablePlayer {
  readonly id: string;
  readonly name: string;
  readonly position: string;
  readonly nationality: string;
}

export interface UsePlayerSearchOptions {
  readonly players: Ref<readonly SearchablePlayer[]>;
  readonly usedPlayerIds: Ref<ReadonlySet<string>>;
  readonly maxResults?: number;
}

export function usePlayerSearch(options: UsePlayerSearchOptions) {
  const { players, usedPlayerIds, maxResults = 8 } = options;

  const inputValue = ref('');

  const fuse = computed(
    () => new Fuse([...players.value], { keys: ['name'], threshold: 0.3 }),
  );

  const filteredPlayers = computed(() => {
    if (!inputValue.value) return [];
    return fuse.value
      .search(inputValue.value, { limit: maxResults })
      .map((r) => r.item);
  });

  const isUsed = (id: string) => usedPlayerIds.value.has(id);

  const clearInput = () => {
    inputValue.value = '';
  };

  return {
    inputValue,
    filteredPlayers,
    isUsed,
    clearInput,
  };
}
