<script setup lang="ts">
import AppInput from '@/components/ui/AppInput.vue';

defineProps<{
  playerNumber: 1 | 2;
}>();

const name = defineModel<string>({ default: '' });
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-bold"
        :class="playerNumber === 1 ? 'bg-primary/20 text-primary-light' : 'bg-accent/20 text-accent'"
      >
        {{ playerNumber }}
      </div>
      <span class="text-sm font-medium text-text-muted">Player {{ playerNumber }}</span>
    </div>
    <AppInput
      v-model="name"
      :placeholder="`Player ${playerNumber} name`"
    />
  </div>
</template>
