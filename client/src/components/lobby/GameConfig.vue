<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import AppSelect from '@/components/ui/AppSelect.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppSwitch from '@/components/ui/AppSwitch.vue';
import { useCategoriesStore } from '@/stores/categories';
import type { StatCategoryOption } from '@/lib/api';

const props = withDefaults(defineProps<{
  /** When true, settings are hidden behind an "Advanced Settings" toggle */
  collapsible?: boolean;
}>(), {
  collapsible: false,
});

const categoriesStore = useCategoriesStore();

// Whether the advanced settings panel is expanded
const expanded = ref(false);

// Category selection (step-by-step)
const selectedLeague = ref<string[]>([]);
const selectedTeam = ref<string[]>(['all']);
const selectedStatType = ref<string[]>(['APPEARANCES']);

// Game settings
const targetScore = ref<string[]>(['501']);
const matchFormat = ref<string[]>(['3']);
const enableBogeyNumbers = ref(false);

// Randomise animation state
const isShaking = ref(false);

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
  { value: 'APPEARANCES_AND_GOALS', label: 'Appearances + Goals' },
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
  selectedTeam.value.splice(0, selectedTeam.value.length, 'all');
});

// Auto-select first league (Premier League preferred) once categories load
watch(
  () => leagueOptions.value,
  (options) => {
    if (options.length > 0 && !selectedLeague.value[0]) {
      // Prefer Premier League if available, otherwise first option
      const premierLeague = options.find(
        (o) => o.label.toLowerCase().includes('premier league'),
      );
      setArkValue(selectedLeague, premierLeague?.value ?? options[0].value);
    }
  },
  { immediate: true },
);

// Pick a random team from the current league
function selectRandomTeam(): void {
  const teams = teamOptions.value.filter((t) => t.value !== 'all');
  if (teams.length === 0) return;
  const random = teams[Math.floor(Math.random() * teams.length)];
  setArkValue(selectedTeam, random.value);
}

// Weighted random pick utility
function weightedPick<T>(options: readonly { value: T; weight: number }[]): T {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const opt of options) {
    roll -= opt.weight;
    if (roll <= 0) return opt.value;
  }
  return options[options.length - 1].value;
}

// Randomise all settings
function randomiseAll(): void {
  isShaking.value = true;
  setTimeout(() => {
    isShaking.value = false;
  }, 500);

  const leagues = leagueOptions.value;
  if (leagues.length === 0) return;

  const randomLeague = leagues[Math.floor(Math.random() * leagues.length)];
  setArkValue(selectedLeague, randomLeague.value);

  const teamsForLeague = (() => {
    const teams = new Map<string, string>();
    for (const cat of categoriesStore.categories) {
      if (cat.league === randomLeague.value && cat.teamId && cat.teamName) {
        teams.set(cat.teamId, cat.teamName);
      }
    }
    return Array.from(teams.entries()).map(([id, name]) => ({ value: id, label: name }));
  })();

  if (teamsForLeague.length > 0 && Math.random() > 0.3) {
    const randomTeam = teamsForLeague[Math.floor(Math.random() * teamsForLeague.length)];
    setArkValue(selectedTeam, randomTeam.value);
  } else {
    setArkValue(selectedTeam, 'all');
  }

  const statTypes = [...statTypeOptions];
  setArkValue(selectedStatType, statTypes[Math.floor(Math.random() * statTypes.length)].value);

  setArkValue(targetScore, weightedPick([
    { value: '501', weight: 70 },
    { value: '301', weight: 15 },
    { value: '701', weight: 10 },
    { value: '1001', weight: 5 },
  ]));

  setArkValue(matchFormat, weightedPick([
    { value: '1', weight: 30 },
    { value: '3', weight: 50 },
    { value: '5', weight: 20 },
  ]));

  enableBogeyNumbers.value = Math.random() < 0.2;
}

function setArkValue(target: { value: string[] }, newVal: string): void {
  target.value.splice(0, target.value.length, newVal);
}

async function applyPreset(preset: {
  league?: string;
  team?: string;
  statType?: string;
  targetScore?: string;
  matchFormat?: string;
  enableBogeyNumbers?: boolean;
}): Promise<void> {
  if (preset.league !== undefined) {
    setArkValue(selectedLeague, preset.league);
  }

  await nextTick();

  if (preset.team !== undefined) {
    setArkValue(selectedTeam, preset.team);
  }
  if (preset.statType !== undefined) {
    setArkValue(selectedStatType, preset.statType);
  }
  if (preset.targetScore !== undefined) {
    setArkValue(targetScore, preset.targetScore);
  }
  if (preset.matchFormat !== undefined) {
    setArkValue(matchFormat, preset.matchFormat);
  }
  if (preset.enableBogeyNumbers !== undefined) {
    enableBogeyNumbers.value = preset.enableBogeyNumbers;
  }
}

// Summary of current settings for the collapsed view
const settingsSummary = computed(() => {
  const league = leagueOptions.value.find((l) => l.value === selectedLeague.value[0]);
  const team = selectedTeam.value[0] !== 'all'
    ? teamOptions.value.find((t) => t.value === selectedTeam.value[0])?.label
    : null;
  const stat = statTypeOptions.find((s) => s.value === selectedStatType.value[0])?.label ?? 'Appearances';

  const parts = [league?.label ?? 'Loading...'];
  if (team) parts.push(team);
  parts.push(stat);
  parts.push(`${targetScore.value[0]} pts`);
  parts.push(`Best of ${matchFormat.value[0]}`);
  if (enableBogeyNumbers.value) parts.push('Bogey');

  return parts.join(' \u00B7 ');
});

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
    enableBogeyNumbers: enableBogeyNumbers.value,
    category: selectedCategory.value,
  })),
  randomiseAll,
  applyPreset,
  selectedLeague,
  selectedTeam,
  selectedStatType,
  targetScore,
  matchFormat,
  enableBogeyNumbers,
});
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Collapsed summary + toggle (when collapsible) -->
    <template v-if="collapsible && !expanded">
      <div class="flex flex-col gap-3">
        <p class="text-text-muted text-xs leading-relaxed">
          {{ settingsSummary }}
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-sm text-primary-light hover:text-primary transition-colors cursor-pointer self-start"
          @click="expanded = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Advanced Settings
        </button>
      </div>
    </template>

    <!-- Full settings (always shown if not collapsible, or when expanded) -->
    <template v-if="!collapsible || expanded">
      <!-- Collapse button when in expanded collapsible mode -->
      <button
        v-if="collapsible"
        type="button"
        class="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors cursor-pointer self-start -mb-2"
        @click="expanded = false"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m18 15-6-6-6 6" />
        </svg>
        Hide Settings
      </button>

      <!-- Randomise All button -->
      <button
        type="button"
        class="randomise-btn w-full inline-flex items-center justify-center gap-2.5 font-body font-semibold text-base rounded-lg px-5 py-3 bg-bg-elevated text-text border border-border hover:bg-bg-card transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-bg-deep select-none"
        :class="{ 'animate-wobble': isShaking }"
        :disabled="categoriesStore.loading || leagueOptions.length === 0"
        @click="randomiseAll"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="8" height="8" rx="1.5" />
          <circle cx="4.5" cy="4.5" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="7.5" cy="7.5" r="0.75" fill="currentColor" stroke="none" />
          <rect x="14" y="14" width="8" height="8" rx="1.5" />
          <circle cx="16.5" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="19.5" cy="19.5" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="18" cy="18" r="0.75" fill="currentColor" stroke="none" />
          <path d="M16 3h5v5" />
          <path d="M21 3l-7 7" />
          <path d="M16 21h5v-5" />
        </svg>
        Randomise All
      </button>

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

      <AppSwitch
        v-model="enableBogeyNumbers"
        label="Bogey Numbers"
        description="Landing on a bogey number triggers an automatic bust"
      />
    </template>
  </div>
</template>

<style scoped>
@keyframes wobble {
  0% { transform: rotate(0deg); }
  15% { transform: rotate(-4deg); }
  30% { transform: rotate(3deg); }
  45% { transform: rotate(-2deg); }
  60% { transform: rotate(1.5deg); }
  75% { transform: rotate(-1deg); }
  100% { transform: rotate(0deg); }
}

.animate-wobble {
  animation: wobble 0.5s ease-in-out;
}

.randomise-btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
