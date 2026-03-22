<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import AppSelect from '@/components/ui/AppSelect.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppSlider from '@/components/ui/AppSlider.vue';
import AppSwitch from '@/components/ui/AppSwitch.vue';
import { useCategoriesStore } from '@/stores/categories';
import type { StatCategoryOption } from '@/lib/api';

const categoriesStore = useCategoriesStore();

// Category selection (step-by-step)
const selectedLeague = ref<string[]>([]);
const selectedTeam = ref<string[]>(['all']);
const selectedStatType = ref<string[]>(['APPEARANCES']);

// Game settings
const targetScore = ref<string[]>(['501']);
const matchFormat = ref<string[]>(['3']);
const timerDuration = ref([45]);
const enableBogeyNumbers = ref(false);

const targetScoreOptions = [
  { value: '301', label: '301' },
  { value: '501', label: '501' },
  { value: '701', label: '701' },
  { value: '1001', label: '1001' },
] as const;

const matchFormatOptions = [
  { value: '1', label: 'Best of 1' },
  { value: '3', label: 'Best of 3' },
  { value: '5', label: 'Best of 5' },
] as const;

const statTypeOptions = [
  { value: 'APPEARANCES', label: 'Appearances' },
  { value: 'GOALS', label: 'Goals' },
] as const;

// Derive league options from categories
const leagueOptions = computed(() => {
  const seen = new Map<string, string>();
  for (const cat of categoriesStore.categories) {
    if (!seen.has(cat.league)) {
      seen.set(cat.league, cat.leagueName);
    }
  }
  return Array.from(seen.entries())
    .map(([league, name]) => ({ value: league, label: name }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

// Derive team options for the selected league
const teamOptions = computed(() => {
  const league = selectedLeague.value[0];
  if (!league) return [];

  const teams = new Map<string, string>();
  for (const cat of categoriesStore.categories) {
    if (cat.league === league && cat.teamId && cat.teamName) {
      teams.set(cat.teamId, cat.teamName);
    }
  }

  return [
    { value: 'all', label: 'All Teams (League-wide)' },
    ...Array.from(teams.entries())
      .map(([id, name]) => ({ value: id, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
});

// Reset team selection when league changes
watch(selectedLeague, () => {
  selectedTeam.value = ['all'];
});

// Pick a random team from the current league
function selectRandomTeam(): void {
  const teams = teamOptions.value.filter((t) => t.value !== 'all');
  if (teams.length === 0) return;
  const random = teams[Math.floor(Math.random() * teams.length)];
  selectedTeam.value = [random.value];
}

// Resolve the final StatCategoryOption from the three selections
const selectedCategory = computed<StatCategoryOption | null>(() => {
  const league = selectedLeague.value[0];
  const teamId = selectedTeam.value[0];
  const statType = selectedStatType.value[0];
  if (!league || !statType) return null;

  const isAllTeams = !teamId || teamId === 'all';

  return (
    categoriesStore.categories.find(
      (c) =>
        c.league === league &&
        (isAllTeams ? c.teamId === null : c.teamId === teamId) &&
        c.statType === statType,
    ) ?? null
  );
});

onMounted(() => {
  categoriesStore.fetchCategories();
});

defineExpose({
  config: computed(() => ({
    targetScore: Number(targetScore.value[0]),
    matchFormat: Number(matchFormat.value[0]),
    timerDuration: timerDuration.value[0],
    enableBogeyNumbers: enableBogeyNumbers.value,
    category: selectedCategory.value,
  })),
});
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Step 1: League -->
    <AppSelect
      v-model="selectedLeague"
      :items="leagueOptions"
      :loading="categoriesStore.loading"
      label="League"
      placeholder="Select league..."
    />

    <!-- Step 2: Team (visible once a league is chosen) -->
    <div v-if="selectedLeague.length > 0 && selectedLeague[0]" class="flex items-end gap-2">
      <div class="flex-1">
        <AppSelect
          v-model="selectedTeam"
          :items="teamOptions"
          label="Team"
          placeholder="Select team..."
        />
      </div>
      <AppButton
        variant="secondary"
        size="md"
        :disabled="teamOptions.length <= 1"
        @click="selectRandomTeam"
      >
        Random
      </AppButton>
    </div>

    <!-- Step 3: Stat Type -->
    <AppSelect
      v-if="selectedLeague.length > 0 && selectedLeague[0]"
      v-model="selectedStatType"
      :items="statTypeOptions"
      label="Stat Type"
      placeholder="Select stat..."
    />

    <p v-if="categoriesStore.error" class="text-danger text-sm">
      Failed to load categories. Please try again.
    </p>

    <!-- Game settings -->
    <AppSelect
      v-model="targetScore"
      :items="targetScoreOptions"
      label="Target Score"
      placeholder="Select target..."
    />

    <AppSelect
      v-model="matchFormat"
      :items="matchFormatOptions"
      label="Match Format"
      placeholder="Select format..."
    />

    <AppSlider
      v-model="timerDuration"
      :min="15"
      :max="60"
      :step="5"
      label="Timer Duration"
      unit="s"
    />

    <AppSwitch
      v-model="enableBogeyNumbers"
      label="Bogey Numbers"
      description="Landing on a bogey number triggers an automatic bust"
    />
  </div>
</template>
