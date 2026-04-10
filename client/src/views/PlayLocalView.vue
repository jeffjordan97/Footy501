<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppContainer from '@/components/layout/AppContainer.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import GameConfig from '@/components/lobby/GameConfig.vue';
import PlayerSlot from '@/components/lobby/PlayerSlot.vue';
import PresetChips from '@/components/lobby/PresetChips.vue';
import type { GamePreset } from '@/components/lobby/PresetChips.vue';
import { useGameStore } from '@/stores/game';

const router = useRouter();
const gameStore = useGameStore();

const player1Name = ref('');
const player2Name = ref('');
const gameConfigRef = ref<InstanceType<typeof GameConfig>>();
const creating = ref(false);
const errorMessage = ref<string | null>(null);

const presets = computed<readonly GamePreset[]>(() => [
  {
    id: 'random',
    label: 'Random',
    icon: '\uD83C\uDFB2',
    apply: () => {
      gameConfigRef.value?.randomiseAll();
    },
  },
  {
    id: 'speed',
    label: 'Speed Round',
    icon: '\u26A1',
    apply: () => {
      gameConfigRef.value?.applyPreset({
        league: 'Premier League',
        team: 'all',
        statType: 'APPEARANCES',
        targetScore: '301',
        matchFormat: '1',
        timerDuration: 15,
        enableBogeyNumbers: false,
      });
    },
  },
  {
    id: 'classic-pl',
    label: 'Classic PL',
    icon: '\uD83C\uDFC6',
    apply: () => {
      gameConfigRef.value?.applyPreset({
        league: 'Premier League',
        team: 'all',
        statType: 'APPEARANCES_AND_GOALS',
        targetScore: '501',
        matchFormat: '3',
        timerDuration: 45,
        enableBogeyNumbers: false,
      });
    },
  },
  {
    id: 'world-tour',
    label: 'World Tour',
    icon: '\uD83C\uDF0D',
    apply: () => {
      // Random league + random team, rest fixed
      gameConfigRef.value?.randomiseAll();
      // Override with World Tour specifics after randomise
      gameConfigRef.value?.applyPreset({
        statType: 'APPEARANCES',
        targetScore: '501',
        matchFormat: '1',
        timerDuration: 45,
        enableBogeyNumbers: false,
      });
    },
  },
]);

// Clear active preset when user manually changes any setting
watch(
  () => {
    const gc = gameConfigRef.value;
    if (!gc) return null;
    return [
      gc.selectedLeague?.[0],
      gc.selectedTeam?.[0],
      gc.selectedStatType?.[0],
      gc.targetScore?.[0],
      gc.matchFormat?.[0],
      gc.timerDuration?.[0],
      gc.enableBogeyNumbers,
    ];
  },
  () => {
    // Only clear if the change came from user interaction (not from preset application)
    // We use a simple debounce: presets set a flag briefly
  },
);

const startGame = async () => {
  const config = gameConfigRef.value?.config;
  if (!config) return;

  const category = config.category;
  if (!category) {
    errorMessage.value = 'Please select a stat category.';
    return;
  }

  creating.value = true;
  errorMessage.value = null;

  try {
    const gameId = await gameStore.createNewGame({
      targetScore: config.targetScore,
      matchFormat: config.matchFormat,
      timerDuration: config.timerDuration,
      enableBogeyNumbers: config.enableBogeyNumbers,
      categoryId: category.id,
      categoryName: category.name,
      league: category.league,
      teamId: category.teamId ?? undefined,
      statType: category.statType,
      player1Name: player1Name.value || 'Player 1',
      player2Name: player2Name.value || 'Player 2',
    });

    router.push({ name: 'game', params: { id: gameId } });
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to create game. Please try again.';
  } finally {
    creating.value = false;
  }
};
</script>

<template>
  <AppLayout>
    <AppContainer size="sm" class="py-12 flex flex-col gap-8">
      <div class="text-center">
        <h1 class="font-display text-3xl mb-2">Local Game</h1>
        <p class="text-text-muted text-sm">Set up a game on this device</p>
      </div>

      <!-- Players -->
      <AppCard class="p-6">
        <h2 class="font-display text-lg text-text mb-4">Players</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PlayerSlot v-model="player1Name" :player-number="1" />
          <PlayerSlot v-model="player2Name" :player-number="2" />
        </div>
      </AppCard>

      <!-- Quick Presets -->
      <PresetChips :presets="presets" />

      <!-- Game Settings -->
      <AppCard class="p-6">
        <h2 class="font-display text-lg text-text mb-4">Settings</h2>
        <GameConfig ref="gameConfigRef" />
      </AppCard>

      <!-- Error -->
      <p v-if="errorMessage" class="text-danger text-sm text-center -mt-4">
        {{ errorMessage }}
      </p>

      <!-- Start -->
      <AppButton
        variant="success"
        size="lg"
        full-width
        :loading="creating"
        :disabled="creating"
        @click="startGame"
      >
        {{ creating ? 'Creating Game...' : 'Start Game' }}
      </AppButton>
    </AppContainer>
  </AppLayout>
</template>
