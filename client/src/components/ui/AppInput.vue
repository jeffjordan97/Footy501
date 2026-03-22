<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
  label?: string;
  error?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  maxlength?: number;
}>();

const model = defineModel<string>();
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-sm font-medium text-text-muted">
      {{ label }}
    </label>
    <input
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="w-full bg-bg-elevated text-text placeholder:text-text-muted/50 border border-border rounded-lg px-3 py-2.5 text-base font-body transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
      :class="error ? 'border-danger ring-1 ring-danger/30' : ''"
    />
    <p v-if="error" :id="`${id}-error`" class="text-sm text-danger" role="alert">
      {{ error }}
    </p>
  </div>
</template>
