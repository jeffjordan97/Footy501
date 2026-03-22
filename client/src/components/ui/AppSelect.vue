<script setup lang="ts">
import { Select, createListCollection } from '@ark-ui/vue/select';
import { computed } from 'vue';

export interface SelectItem {
  readonly value: string;
  readonly label: string;
}

export interface SelectGroup {
  readonly label: string;
  readonly items: readonly SelectItem[];
}

const props = defineProps<{
  label?: string;
  items?: readonly SelectItem[];
  groups?: readonly SelectGroup[];
  placeholder?: string;
  loading?: boolean;
}>();

const model = defineModel<string[]>({ default: () => [] });

const allItems = computed(() => {
  if (props.items) return [...props.items];
  if (props.groups) return props.groups.flatMap((g) => [...g.items]);
  return [];
});

const collection = computed(() =>
  createListCollection({ items: allItems.value }),
);
</script>

<template>
  <Select.Root
    v-model="model"
    :collection="collection"
    :positioning="{ placement: 'bottom' }"
  >
    <Select.Label v-if="label" class="text-sm font-medium text-text-muted mb-1.5 block">
      {{ label }}
    </Select.Label>
    <Select.Control>
      <Select.Trigger
        :disabled="loading"
        class="w-full flex items-center justify-between bg-bg-elevated text-text border border-border/40 rounded-lg px-3 py-2.5 text-base font-body transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary hover:border-primary-light/40 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Select.ValueText :placeholder="loading ? 'Loading...' : (placeholder ?? 'Select...')" />
        <Select.Indicator>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </Select.Indicator>
      </Select.Trigger>
    </Select.Control>
    <Select.Positioner>
      <Select.Content
        class="bg-bg-card border border-border/40 rounded-lg shadow-elevated overflow-hidden z-50 py-1 min-w-(--reference-width) max-h-72 overflow-y-auto"
      >
        <!-- Grouped items -->
        <template v-if="groups">
          <Select.ItemGroup v-for="group in groups" :key="group.label" :id="group.label">
            <Select.ItemGroupLabel
              :htmlFor="group.label"
              class="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider"
            >
              {{ group.label }}
            </Select.ItemGroupLabel>
            <Select.Item
              v-for="item in group.items"
              :key="item.value"
              :item="item"
              class="flex items-center justify-between px-3 py-2 text-text cursor-pointer transition-colors duration-100 hover:bg-primary/10 data-highlighted:bg-primary/10 data-[state=checked]:text-primary-light"
            >
              <Select.ItemText>{{ item.label }}</Select.ItemText>
              <Select.ItemIndicator>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </Select.ItemIndicator>
            </Select.Item>
          </Select.ItemGroup>
        </template>

        <!-- Flat items -->
        <template v-else>
          <Select.Item
            v-for="item in items"
            :key="item.value"
            :item="item"
            class="flex items-center justify-between px-3 py-2 text-text cursor-pointer transition-colors duration-100 hover:bg-primary/10 data-highlighted:bg-primary/10 data-[state=checked]:text-primary-light"
          >
            <Select.ItemText>{{ item.label }}</Select.ItemText>
            <Select.ItemIndicator>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </Select.ItemIndicator>
          </Select.Item>
        </template>
      </Select.Content>
    </Select.Positioner>
  </Select.Root>
</template>
