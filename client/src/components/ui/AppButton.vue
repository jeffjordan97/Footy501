<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
  }>(),
  {
    variant: 'primary',
    size: 'md',
  },
);

defineEmits<{
  click: [event: MouseEvent];
}>();

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center font-body font-semibold rounded-lg transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-bg-deep select-none';

  const variants: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-primary-light',
    secondary: 'bg-bg-elevated text-text border border-border hover:bg-bg-card',
    ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-bg-elevated',
    danger: 'bg-danger text-white hover:bg-danger/80',
    success: 'bg-success text-white hover:bg-success/80',
  };

  const sizes: Record<string, string> = {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-base px-5 py-2.5 gap-2',
    lg: 'text-lg px-7 py-3.5 gap-2.5',
  };

  const disabled = props.disabled || props.loading
    ? 'opacity-50 pointer-events-none'
    : '';

  const width = props.fullWidth ? 'w-full' : '';

  return [base, variants[props.variant], sizes[props.size], disabled, width].join(' ');
});
</script>

<template>
  <button
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <slot />
  </button>
</template>
