<script setup lang="ts">
import { ref } from 'vue';
import AppBadge from '@/components/ui/AppBadge.vue';

interface TurnEntry {
  readonly playerIndex: 0 | 1;
  readonly footballerName: string | null;
  readonly statValue: number | null;
  readonly scoreAfter: number;
  readonly result: string;
}

defineProps<{
  turns: readonly TurnEntry[];
  player1Name: string;
  player2Name: string;
}>();

const expanded = ref(false);

const resultBadge = (result: string): { label: string; variant: 'success' | 'danger' | 'warning' | 'muted' } => {
  switch (result) {
    case 'VALID':
      return { label: 'VALID', variant: 'success' };
    case 'CHECKOUT':
      return { label: 'CHECKOUT', variant: 'warning' };
    case 'TIMEOUT':
      return { label: 'TIMEOUT', variant: 'muted' };
    case 'DUPLICATE_PLAYER':
      return { label: 'DUPLICATE', variant: 'danger' };
    default:
      if (result.startsWith('BUST'))
        return { label: 'BUST', variant: 'danger' };
      return { label: result, variant: 'muted' };
  }
};
</script>

<template>
  <div class="flex flex-col gap-1">
    <!-- Latest turn inline preview -->
    <div
      v-if="turns.length > 0 && !expanded"
      class="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-elevated text-sm"
    >
      <div
        class="w-5 h-5 rounded-full text-[10px] font-display font-bold flex items-center justify-center shrink-0"
        :class="turns[turns.length - 1].playerIndex === 0
          ? 'bg-primary/20 text-primary-light'
          : 'bg-accent/20 text-accent'"
      >
        {{ turns[turns.length - 1].playerIndex + 1 }}
      </div>
      <span v-if="turns[turns.length - 1].footballerName" class="text-text truncate flex-1">
        {{ turns[turns.length - 1].footballerName }}
        <span v-if="turns[turns.length - 1].statValue !== null" class="text-text-muted">
          &mdash; {{ turns[turns.length - 1].statValue }}
        </span>
      </span>
      <span v-else class="text-text-muted italic flex-1">No answer</span>
      <AppBadge :variant="resultBadge(turns[turns.length - 1].result).variant">
        {{ resultBadge(turns[turns.length - 1].result).label }}
      </AppBadge>
    </div>

    <div
      v-if="turns.length === 0 && !expanded"
      class="text-center text-text-muted text-sm py-4"
    >
      No turns yet
    </div>

    <!-- Expanded history -->
    <div v-if="expanded" class="flex flex-col gap-1 max-h-64 overflow-y-auto">
      <div
        v-for="(turn, i) in [...turns].reverse()"
        :key="`${turns.length - 1 - i}-${turn.playerIndex}-${turn.result}`"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
        :class="i === 0 ? 'bg-bg-elevated' : 'bg-transparent'"
      >
        <div
          class="w-5 h-5 rounded-full text-[10px] font-display font-bold flex items-center justify-center shrink-0"
          :class="turn.playerIndex === 0
            ? 'bg-primary/20 text-primary-light'
            : 'bg-accent/20 text-accent'"
        >
          {{ turn.playerIndex + 1 }}
        </div>
        <div class="flex-1 min-w-0">
          <span v-if="turn.footballerName" class="text-text truncate">
            {{ turn.footballerName }}
          </span>
          <span v-else class="text-text-muted italic">No answer</span>
          <span v-if="turn.statValue !== null" class="text-text-muted ml-1">
            &mdash; {{ turn.statValue }}
          </span>
        </div>
        <span class="font-mono text-xs text-text-muted tabular-nums shrink-0">
          {{ turn.scoreAfter }}
        </span>
        <AppBadge :variant="resultBadge(turn.result).variant">
          {{ resultBadge(turn.result).label }}
        </AppBadge>
      </div>
    </div>

    <!-- Toggle button -->
    <button
      v-if="turns.length > 1"
      class="text-xs text-text-muted hover:text-text transition-colors duration-150 cursor-pointer py-1 text-center"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Show less' : `Show all ${turns.length} turns` }}
    </button>
  </div>
</template>
