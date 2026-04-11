import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { API_BASE, getAuthProviders } from '@/lib/api';

export interface AuthUser {
  readonly id: string;
  readonly displayName: string;
  readonly authProvider: string;
}

export interface AuthProviders {
  readonly google: boolean;
  readonly guest: boolean;
}

const STORAGE_KEY = 'footy501_token';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEY));
  const user = ref<AuthUser | null>(null);
  const loading = ref(false);
  const providers = ref<AuthProviders>({ google: false, guest: true });

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isGuest = computed(() => user.value?.authProvider === 'guest');

  function authHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {};
  }

  async function fetchProviders(): Promise<void> {
    try {
      const result = await getAuthProviders();
      providers.value = result.providers;
    } catch {
      // Default to guest-only if API fails
    }
  }

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

  function loginWithGoogle(): void {
    const apiBase = import.meta.env.VITE_API_URL ?? '';
    window.location.href = `${apiBase}/api/auth/google`;
  }

  function linkGoogle(): void {
    if (!user.value) return;
    const apiBase = import.meta.env.VITE_API_URL ?? '';
    window.location.href = `${apiBase}/api/auth/google?linkTo=${user.value.id}`;
  }

  function handleOAuthCallback(newToken: string): void {
    token.value = newToken;
    localStorage.setItem(STORAGE_KEY, newToken);
  }

  async function loadUser(): Promise<void> {
    if (!token.value) return;
    loading.value = true;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        logout();
        return;
      }
      const data = await res.json();
      user.value = data.user;
    } catch {
      // Silently fail — user will appear as unauthenticated
    } finally {
      loading.value = false;
    }
  }

  async function updateDisplayName(displayName: string): Promise<void> {
    loading.value = true;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update name');

      token.value = data.token;
      user.value = data.user;
      localStorage.setItem(STORAGE_KEY, data.token);
    } finally {
      loading.value = false;
    }
  }

  async function deleteAccount(): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/me/delete`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to delete account');
    logout();
  }

  async function cancelDeletion(): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/me/cancel-delete`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to cancel deletion');
    user.value = data.user;
  }

  async function exportData(): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/me/data`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to export data');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'footy501-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function logout(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    token,
    user,
    loading,
    providers,
    isAuthenticated,
    isGuest,
    fetchProviders,
    loginAsGuest,
    loginWithGoogle,
    linkGoogle,
    handleOAuthCallback,
    loadUser,
    updateDisplayName,
    deleteAccount,
    cancelDeletion,
    exportData,
    logout,
  };
});
