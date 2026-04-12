<script setup lang="ts">
import { computed } from 'vue';
import PlayerPanel from './PlayerPanel.vue';

const props = defineProps<{
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  activePlayer: 0 | 1;
  legWins: readonly [number, number];
  targetScore: number;
}>();

const SOLO_PLAYER2_NAMES = new Set(['Target', 'Practice Mode']);
const isSoloMode = computed(() => SOLO_PLAYER2_NAMES.has(props.player2Name));
</script>

<template>
  <div :class="isSoloMode ? '' : 'grid grid-cols-2 gap-3'">
    <PlayerPanel
      :player-name="player1Name"
      :player-number="1"
      :score="player1Score"
      :is-active="activePlayer === 0"
      :leg-wins="legWins[0]"
      :target-score="targetScore"
    />
    <PlayerPanel
      v-if="!isSoloMode"
      :player-name="player2Name"
      :player-number="2"
      :score="player2Score"
      :is-active="activePlayer === 1"
      :leg-wins="legWins[1]"
      :target-score="targetScore"
    />
  </div>
</template>
