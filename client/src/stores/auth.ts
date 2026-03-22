import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { API_BASE } from '@/lib/api';

export interface AuthUser {
  readonly id: string;
  readonly displayName: string;
  readonly authProvider: string;
}

const STORAGE_KEY = 'footy501_token';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEY));
  const user = ref<AuthUser | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  async function loginAsGuest(displayName: string): Promise<void> {
    loading.value = true;
    try {
      const res = await fetch(`${API_BASE}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed');

      token.value = data.token;
      user.value = data.user;
      localStorage.setItem(STORAGE_KEY, data.token);
    } finally {
      loading.value = false;
    }
  }

  async function loadUser(): Promise<void> {
    if (!token.value) return;
    loading.value = true;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      if (!res.ok) {
        logout();
        return;
      }
      const data = await res.json();
      user.value = data.user;
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      loading.value = false;
    }
  }

  function logout(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  return { token, user, loading, isAuthenticated, loginAsGuest, loadUser, logout };
});
