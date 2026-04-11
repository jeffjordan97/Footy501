<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppContainer from '@/components/layout/AppContainer.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppInput from '@/components/ui/AppInput.vue';
import GameConfig from '@/components/lobby/GameConfig.vue';
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
    errorMessage.value = 'Loading categories — please wait a moment.';
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
    <AppContainer size="sm" class="py-12 flex flex-col gap-6">
      <div class="text-center">
        <h1 class="font-display text-3xl mb-2">Local Game</h1>
        <p class="text-text-muted text-sm">Play against a friend on the same device</p>
      </div>

      <!-- Players (inline, compact) -->
      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="player1Name" placeholder="Player 1" />
        <AppInput v-model="player2Name" placeholder="Player 2" />
      </div>

      <!-- Start Game (prominent, above the fold) -->
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

      <!-- Error -->
      <p v-if="errorMessage" class="text-danger text-sm text-center -mt-2">
        {{ errorMessage }}
      </p>

      <!-- Advanced settings (collapsed by default) -->
      <GameConfig ref="gameConfigRef" collapsible />
    </AppContainer>
  </AppLayout>
</template>
