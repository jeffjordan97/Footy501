<script setup lang="ts">
import { toRef } from 'vue';
import { Combobox } from '@ark-ui/vue/combobox';
import { usePlayerSearch, type SearchablePlayer } from '@/composables/usePlayerSearch';

export interface PlayerOption extends SearchablePlayer {}

const props = defineProps<{
  players: readonly PlayerOption[];
  usedPlayerIds: ReadonlySet<string>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [player: PlayerOption];
}>();

const { inputValue, filteredPlayers, isUsed, clearInput } = usePlayerSearch({
  players: toRef(() => props.players),
  usedPlayerIds: toRef(() => props.usedPlayerIds),
});

const handleSelect = (details: { items: unknown[] }) => {
  const player = details.items[0] as PlayerOption | undefined;
  if (player && !isUsed(player.id)) {
    emit('select', player);
    clearInput();
  }
};

const onInputValueChange = (e: { inputValue: string }) => {
  inputValue.value = e.inputValue;
};
</script>

<template>
  <Combobox.Root
    :items="filteredPlayers.map((p) => ({ label: p.name, value: p.id, ...p }))"
    :input-value="inputValue"
    :disabled="disabled"
    @input-value-change="onInputValueChange"
    @value-change="handleSelect"
  >
    <Combobox.Label class="sr-only">Search for a footballer</Combobox.Label>
    <Combobox.Control class="relative">
      <Combobox.Input
        class="w-full bg-bg-elevated text-text placeholder:text-text-muted/50 border border-border rounded-lg px-4 py-3 text-base font-body transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder="Name a footballer..."
        :disabled="disabled"
      />
      <Combobox.Trigger class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer" aria-label="Show suggestions">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </Combobox.Trigger>
    </Combobox.Control>

    <Combobox.Positioner>
      <Combobox.Content
        class="bg-bg-card border border-border rounded-lg shadow-elevated overflow-hidden z-50 py-1 max-h-64 overflow-y-auto min-w-(--reference-width)"
      >
        <Combobox.Item
          v-for="player in filteredPlayers"
          :key="player.id"
          :item="{ label: player.name, value: player.id, ...player }"
          class="flex items-center justify-between px-4 py-2.5 transition-colors duration-100 data-highlighted:bg-primary/10"
          :class="isUsed(player.id)
            ? 'opacity-40 cursor-not-allowed'
            : 'cursor-pointer'"
        >
          <div class="flex flex-col">
            <Combobox.ItemText class="text-sm font-medium text-text">
              {{ player.name }}
            </Combobox.ItemText>
            <span class="text-xs text-text-muted">
              {{ player.position }} &middot; {{ player.nationality }}
            </span>
          </div>
          <span
            v-if="isUsed(player.id)"
            class="text-xs text-accent font-mono"
          >
            Used
          </span>
        </Combobox.Item>

        <div
          v-if="inputValue && filteredPlayers.length === 0"
          class="px-4 py-3 text-sm text-text-muted text-center"
        >
          No players found
        </div>
      </Combobox.Content>
    </Combobox.Positioner>
  </Combobox.Root>
</template>
