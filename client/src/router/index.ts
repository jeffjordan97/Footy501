import { createRouter, createWebHistory } from 'vue-router';
import { getGame } from '@/lib/api';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/play/local',
      name: 'play-local',
      component: () => import('@/views/PlayLocalView.vue'),
    },
    {
      path: '/play/online',
      name: 'play-online',
      component: () => import('@/views/PlayOnlineView.vue'),
    },
    {
      path: '/play/daily',
      name: 'play-daily',
      component: () => import('@/views/PlayDailyView.vue'),
    },
    {
      path: '/play/solo',
      name: 'play-solo',
      component: () => import('@/views/PlaySoloView.vue'),
    },
    {
      path: '/game/:id',
      name: 'game',
      component: () => import('@/views/GameView.vue'),
      beforeEnter: async (to) => {
        const gameId = to.params.id as string;
        // Skip server validation for online games (socket delivers state)
        if (to.query.mode === 'online') return true;
        // Validate format
        if (!/^[a-f0-9-]{8,36}$/i.test(gameId)) {
          return { name: 'home' };
        }
        try {
          await getGame(gameId);
          return true;
        } catch {
          return { name: 'home' };
        }
      },
    },
    {
      path: '/game/:id/summary',
      name: 'game-summary',
      component: () => import('@/views/GameSummaryView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
});

export default router;
