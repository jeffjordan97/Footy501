<script setup lang="ts">
import { Tooltip } from '@ark-ui/vue/tooltip';

defineProps<{
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}>();
</script>

<template>
  <Tooltip.Root :positioning="{ placement: placement ?? 'top' }" :open-delay="300" :close-delay="100">
    <Tooltip.Trigger as-child>
      <slot />
    </Tooltip.Trigger>
    <Tooltip.Positioner>
      <Tooltip.Content
        class="bg-bg-elevated text-text text-xs rounded-lg px-3 py-1.5 shadow-elevated border border-border/30 max-w-48 z-50"
      >
        {{ content }}
      </Tooltip.Content>
    </Tooltip.Positioner>
  </Tooltip.Root>
</template>
