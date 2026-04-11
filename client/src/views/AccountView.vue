<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppContainer from '@/components/layout/AppContainer.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppInput from '@/components/ui/AppInput.vue';

const router = useRouter();
const authStore = useAuthStore();
const { isAuthenticated, user, isGuest, providers, loading } = storeToRefs(authStore);

// Display name editing
const editingName = ref(false);
const nameInput = ref('');
const nameError = ref<string | null>(null);

function startEditName(): void {
  nameInput.value = user.value?.displayName ?? '';
  editingName.value = true;
  nameError.value = null;
}

async function saveName(): Promise<void> {
  const trimmed = nameInput.value.trim();
  if (!trimmed || trimmed.length > 30) {
    nameError.value = 'Name must be 1-30 characters';
    return;
  }
  nameError.value = null;
  try {
    await authStore.updateDisplayName(trimmed);
    editingName.value = false;
  } catch (err) {
    nameError.value = err instanceof Error ? err.message : 'Failed to update name';
  }
}

function cancelEditName(): void {
  editingName.value = false;
  nameError.value = null;
}

// Data export
const exporting = ref(false);
async function handleExport(): Promise<void> {
  exporting.value = true;
  try {
    await authStore.exportData();
  } catch {
    // Best-effort — browser will show download or not
  } finally {
    exporting.value = false;
  }
}

// Account deletion
const showDeleteConfirm = ref(false);
const deleteConfirmInput = ref('');
const deleteError = ref<string | null>(null);
const deleting = ref(false);

function openDeleteConfirm(): void {
  showDeleteConfirm.value = true;
  deleteConfirmInput.value = '';
  deleteError.value = null;
}

function cancelDelete(): void {
  showDeleteConfirm.value = false;
  deleteConfirmInput.value = '';
  deleteError.value = null;
}

async function confirmDelete(): Promise<void> {
  if (deleteConfirmInput.value !== user.value?.displayName) {
    deleteError.value = 'Name does not match';
    return;
  }

  deleting.value = true;
  deleteError.value = null;
  try {
    await authStore.deleteAccount();
    router.replace({ name: 'home' });
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Failed to delete account';
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  if (!authStore.token) {
    router.replace({ name: 'home' });
    return;
  }
  if (!authStore.user) {
    authStore.loadUser();
  }
  authStore.fetchProviders();
});
</script>

<template>
  <AppLayout>
    <AppContainer size="sm" class="py-12 flex flex-col gap-8">
      <div class="text-center">
        <h1 class="font-display text-3xl mb-2">Account Settings</h1>
      </div>

      <!-- Not authenticated — redirect will fire, show nothing -->
      <template v-if="!isAuthenticated && !loading">
        <AppCard class="p-6 text-center">
          <p class="text-text-muted text-sm">You need to sign in to access account settings.</p>
          <AppButton variant="primary" class="mt-4" @click="router.push({ name: 'home' })">
            Go Home
          </AppButton>
        </AppCard>
      </template>

      <template v-else-if="user">
        <!-- Profile -->
        <AppCard class="p-6">
          <h2 class="font-display text-lg text-text mb-4">Profile</h2>

          <div class="flex flex-col gap-4">
            <!-- Display name -->
            <div>
              <label class="text-xs text-text-muted mb-1 block">Display Name</label>
              <template v-if="!editingName">
                <div class="flex items-center gap-3">
                  <span class="text-text font-medium">{{ user.displayName }}</span>
                  <button
                    class="text-xs text-primary-light hover:text-primary transition-colors cursor-pointer"
                    @click="startEditName"
                  >
                    Edit
                  </button>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center gap-2">
                  <AppInput
                    v-model="nameInput"
                    :maxlength="30"
                    class="flex-1"
                    @keyup.enter="saveName"
                    @keyup.escape="cancelEditName"
                  />
                  <AppButton variant="primary" size="sm" :loading="loading" @click="saveName">
                    Save
                  </AppButton>
                  <AppButton variant="ghost" size="sm" @click="cancelEditName">
                    Cancel
                  </AppButton>
                </div>
                <p v-if="nameError" class="text-danger text-xs mt-1">{{ nameError }}</p>
              </template>
            </div>

            <!-- Account type -->
            <div>
              <label class="text-xs text-text-muted mb-1 block">Account Type</label>
              <div class="flex items-center gap-2">
                <svg v-if="user.authProvider === 'google'" class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span class="text-text font-medium text-sm">
                  {{ user.authProvider === 'google' ? 'Google' : 'Guest' }}
                </span>
              </div>
            </div>

            <!-- Link Google (guests only) -->
            <div v-if="isGuest && providers.google" class="pt-2 border-t border-border">
              <p class="text-text-muted text-xs mb-2">
                Link your Google account to sign in on any device and keep your stats.
              </p>
              <button
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white text-[#3c4043] text-xs font-medium border border-[#dadce0] hover:bg-[#f8f9fa] transition-colors duration-150 cursor-pointer"
                @click="authStore.linkGoogle()"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Link Google Account
              </button>
            </div>
          </div>
        </AppCard>

        <!-- Data -->
        <AppCard class="p-6">
          <h2 class="font-display text-lg text-text mb-4">Your Data</h2>

          <div class="flex flex-col gap-4">
            <div>
              <p class="text-text-muted text-xs mb-2">
                Download a copy of your account data and game history as a JSON file.
              </p>
              <AppButton variant="secondary" size="sm" :loading="exporting" @click="handleExport">
                {{ exporting ? 'Exporting...' : 'Export My Data' }}
              </AppButton>
            </div>
          </div>
        </AppCard>

        <!-- Danger zone -->
        <AppCard class="p-6 border-danger/30">
          <h2 class="font-display text-lg text-danger mb-4">Danger Zone</h2>

          <template v-if="!showDeleteConfirm">
            <p class="text-text-muted text-xs mb-3">
              Permanently delete your account and all associated data. Your game history will be anonymised on leaderboards.
              There is a 14-day grace period — sign back in to cancel.
            </p>
            <AppButton variant="danger" size="sm" @click="openDeleteConfirm">
              Delete Account
            </AppButton>
          </template>

          <template v-else>
            <div class="bg-danger/5 border border-danger/20 rounded-lg p-4 flex flex-col gap-3">
              <p class="text-sm text-text font-medium">
                Are you sure? This will permanently delete your account after 14 days.
              </p>
              <p class="text-xs text-text-muted">
                Type <strong class="text-text">{{ user.displayName }}</strong> to confirm.
              </p>
              <AppInput
                v-model="deleteConfirmInput"
                placeholder="Type your display name..."
                @keyup.enter="confirmDelete"
              />
              <p v-if="deleteError" class="text-danger text-xs">{{ deleteError }}</p>
              <div class="flex gap-2">
                <AppButton
                  variant="danger"
                  size="sm"
                  :loading="deleting"
                  :disabled="deleteConfirmInput !== user.displayName || deleting"
                  @click="confirmDelete"
                >
                  {{ deleting ? 'Deleting...' : 'Delete My Account' }}
                </AppButton>
                <AppButton variant="ghost" size="sm" @click="cancelDelete">
                  Cancel
                </AppButton>
              </div>
            </div>
          </template>
        </AppCard>
      </template>
    </AppContainer>
  </AppLayout>
</template>
