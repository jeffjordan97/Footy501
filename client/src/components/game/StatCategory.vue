<script setup lang="ts">
defineProps<{
  name: string;
  league: string;
  team: string | null;
  statType: string;
}>();

const statLabel = (type: string) => {
  switch (type) {
    case 'APPEARANCES': return 'Appearances';
    case 'GOALS': return 'Goals';
    case 'APPEARANCES_AND_GOALS': return 'Apps + Goals';
    case 'APPEARANCES_MINUS_GOALS': return 'Apps - Goals';
    case 'APPEARANCES_AND_CLEAN_SHEETS': return 'Apps + Clean Sheets';
    case 'INTERNATIONAL_APPEARANCES': return 'Int\'l Appearances';
    default: return type;
  }
};
</script>

<template>
  <div class="flex items-center gap-2 text-xs text-text-muted">
    <span>{{ league }}</span>
    <template v-if="team">
      <span class="text-text-muted/30">&middot;</span>
      <span>{{ team }}</span>
    </template>
    <span class="text-text-muted/30">&middot;</span>
    <span class="text-primary-light font-medium">{{ statLabel(statType) }}</span>
  </div>
</template>
