<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppContainer from '@/components/layout/AppContainer.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import GameConfig from '@/components/lobby/GameConfig.vue';
import PlayerSlot from '@/components/lobby/PlayerSlot.vue';
import { useGameStore } from '@/stores/game';

const router = useRouter();
const gameStore = useGameStore();

const player1Name = ref('');
const player2Name = ref('');
const gameConfigRef = ref<InstanceType<typeof GameConfig>>();
const creating = ref(false);
const errorMessage = ref<string | null>(null);

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
