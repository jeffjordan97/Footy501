<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppContainer from '@/components/layout/AppContainer.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import GameConfig from '@/components/lobby/GameConfig.vue';
import AppInput from '@/components/ui/AppInput.vue';
import PresetChips from '@/components/lobby/PresetChips.vue';
import type { GamePreset } from '@/components/lobby/PresetChips.vue';
import { useGameStore } from '@/stores/game';

const router = useRouter();
const gameStore = useGameStore();

const playerName = ref('');
const gameConfigRef = ref<InstanceType<typeof GameConfig>>();
const presetChipsRef = ref<InstanceType<typeof PresetChips>>();
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
        league: 'GB1',
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
        league: 'GB1',
        team: 'all',
        statType: 'GOALS',
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
      gameConfigRef.value?.randomiseAll();
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
      matchFormat: 1,
      timerDuration: 300,
      enableBogeyNumbers: config.enableBogeyNumbers,
      categoryId: category.id,
      categoryName: category.name,
      league: category.league,
      teamId: category.teamId ?? undefined,
      statType: category.statType,
      player1Name: playerName.value || 'You',
      player2Name: 'Practice Mode',
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
        <h1 class="font-display text-3xl mb-2">Solo Practice</h1>
        <p class="text-text-muted text-sm">Practice at your own pace with no timer pressure</p>
      </div>

      <!-- Player name -->
      <AppCard class="p-6">
        <h2 class="font-display text-lg text-text mb-4">Your Name</h2>
        <AppInput
          v-model="playerName"
          placeholder="Enter your name..."
        />
      </AppCard>

      <!-- Quick Presets -->
      <PresetChips ref="presetChipsRef" :presets="presets" />

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
        {{ creating ? 'Starting...' : 'Start Practice' }}
      </AppButton>
    </AppContainer>
  </AppLayout>
</template>
