<script setup lang="ts">
import { Slider } from '@ark-ui/vue/slider';

defineProps<{
  label?: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}>();

const model = defineModel<number[]>({ default: () => [45] });

const onValueChange = (e: { value: number[] }) => {
  model.value = e.value;
};
</script>

<template>
  <Slider.Root
    :min="min"
    :max="max"
    :step="step ?? 1"
    :value="model"
    @value-change="onValueChange"
    class="flex flex-col gap-2"
  >
    <div class="flex items-center justify-between">
      <Slider.Label v-if="label" class="text-sm font-medium text-text-muted">
        {{ label }}
      </Slider.Label>
      <Slider.ValueText class="text-sm font-mono text-primary-light">
        {{ model[0] }}{{ unit ?? '' }}
      </Slider.ValueText>
    </div>
    <Slider.Control class="relative flex items-center h-6 cursor-pointer">
      <Slider.Track class="relative w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <Slider.Range class="absolute h-full bg-primary rounded-full" />
      </Slider.Track>
      <Slider.Thumb
        :index="0"
        class="absolute w-5 h-5 rounded-full bg-primary border-2 border-bg-deep shadow-elevated transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </Slider.Control>
  </Slider.Root>
</template>
