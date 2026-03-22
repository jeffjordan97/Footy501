<script setup lang="ts">
import PlayerPanel from './PlayerPanel.vue';

defineProps<{
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  activePlayer: 0 | 1;
  legWins: readonly [number, number];
  targetScore: number;
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <PlayerPanel
      :player-name="player1Name"
      :player-number="1"
      :score="player1Score"
      :is-active="activePlayer === 0"
      :leg-wins="legWins[0]"
      :target-score="targetScore"
    />
    <PlayerPanel
      :player-name="player2Name"
      :player-number="2"
      :score="player2Score"
      :is-active="activePlayer === 1"
      :leg-wins="legWins[1]"
      :target-score="targetScore"
    />
  </div>
</template>
