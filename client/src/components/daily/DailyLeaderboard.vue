<script setup lang="ts">
export interface LeaderboardEntry {
  readonly rank: number;
  readonly name: string;
  readonly score: number;
  readonly turns: number;
}

defineProps<{
  entries: readonly LeaderboardEntry[];
  currentUserRank?: number;
}>();

const rankStyle = (rank: number) => {
  switch (rank) {
    case 1: return 'text-warning';
    case 2: return 'text-text-muted';
    case 3: return 'text-accent';
    default: return 'text-text-muted';
  }
};
</script>

<template>
  <div class="flex flex-col">
    <!-- Header -->
    <div class="grid grid-cols-[2rem_1fr_4rem_4rem] gap-2 px-3 py-2 text-xs text-text-muted uppercase tracking-wider border-b border-border">
      <span>#</span>
      <span>Player</span>
      <span class="text-right">Score</span>
      <span class="text-right">Turns</span>
    </div>

    <!-- Entries -->
    <div
      v-for="entry in entries"
      :key="entry.rank"
      class="grid grid-cols-[2rem_1fr_4rem_4rem] gap-2 px-3 py-2.5 text-sm transition-colors duration-100"
      :class="entry.rank === currentUserRank ? 'bg-primary/10 rounded-lg' : ''"
    >
      <span class="font-mono font-bold" :class="rankStyle(entry.rank)">
        {{ entry.rank }}
      </span>
      <span class="text-text truncate" :class="entry.rank === currentUserRank ? 'font-semibold' : ''">
        {{ entry.name }}
      </span>
      <span class="text-right font-mono tabular-nums text-text-muted">
        {{ entry.score }}
      </span>
      <span class="text-right font-mono tabular-nums text-text-muted">
        {{ entry.turns }}
      </span>
    </div>

    <div
      v-if="entries.length === 0"
      class="text-center text-text-muted text-sm py-6"
    >
      No entries yet today
    </div>
  </div>
</template>
