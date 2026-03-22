<script setup lang="ts">
import { Switch } from '@ark-ui/vue/switch';

defineProps<{
  label: string;
  description?: string;
}>();

const model = defineModel<boolean>({ default: false });

const onCheckedChange = (e: { checked: boolean }) => {
  model.value = e.checked;
};
</script>

<template>
  <Switch.Root
    :checked="model"
    @checked-change="onCheckedChange"
    class="flex items-center justify-between gap-3 cursor-pointer"
  >
    <div class="flex flex-col">
      <Switch.Label class="text-sm font-medium text-text cursor-pointer">
        {{ label }}
      </Switch.Label>
      <span v-if="description" class="text-xs text-text-muted">
        {{ description }}
      </span>
    </div>
    <Switch.Control
      class="relative w-11 h-6 rounded-full border border-border/40 transition-colors duration-150 data-[state=checked]:bg-primary data-[state=unchecked]:bg-bg-elevated"
    >
      <Switch.Thumb
        class="block w-5 h-5 rounded-full bg-text shadow-sm transition-transform duration-150 translate-x-0.5 data-[state=checked]:translate-x-5.5"
      />
    </Switch.Control>
    <Switch.HiddenInput />
  </Switch.Root>
</template>
