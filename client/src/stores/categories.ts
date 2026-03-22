import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getCategories, type StatCategoryOption } from '@/lib/api';

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<readonly StatCategoryOption[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchCategories(): Promise<void> {
    if (categories.value.length > 0) return; // already loaded

    loading.value = true;
    error.value = null;
    try {
      const response = await getCategories();
      categories.value = response.categories;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load categories';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    categories,
    loading,
    error,
    fetchCategories,
  };
});
