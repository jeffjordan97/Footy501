import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { logError } from '../lib/log-error.js';
import {
  getTodayChallenge,
  startDailyAttempt,
  completeDailyAttempt,
  getDailyLeaderboard,
  hasPlayedToday,
  getChallengeByDate,
} from '../services/daily-service.js';
import { getGame } from '../services/game-service.js';
import { verifyToken } from '../services/auth-service.js';
import type { MatchState } from '../lib/game-engine/types.js';

const router: RouterType = Router();

const StartSchema = z.object({
  displayName: z.string().min(1).max(30),
  userId: z.string().uuid().optional(),
  player2Name: z.string().min(1).max(30).optional(),
});

const CompleteSchema = z.object({
  gameId: z.string().uuid(),
});

// GET /api/daily/today - Get today's challenge info
router.get('/today', async (_req, res) => {
  try {
    const challenge = await getTodayChallenge();
    res.json({ challenge });
  } catch (error) {
    logError('Get daily challenge failed', error);
    res.status(500).json({ error: 'Failed to get daily challenge' });
  }
});

// POST /api/daily/start - Start today's challenge
router.post('/start', async (req, res) => {
  const parsed = StartSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  try {
    const challenge = await getTodayChallenge();
    const userId = parsed.data.userId ?? null;

    const player2Name = parsed.data.player2Name;

    // Check if already played
    const status = await hasPlayedToday(challenge.id, userId, parsed.data.displayName);
    if (status.played && status.attemptId && status.gameId) {
      // Allow resuming an existing attempt
      const result = await startDailyAttempt(challenge.id, userId, parsed.data.displayName, player2Name);
      res.json(result);
      return;
    }

    const result = await startDailyAttempt(challenge.id, userId, parsed.data.displayName, player2Name);
    res.status(201).json(result);
  } catch (error) {
    logError('Start daily attempt failed', error);
    res.status(500).json({ error: 'Failed to start daily challenge' });
  }
});

// POST /api/daily/complete - Mark attempt as complete (score derived server-side)
router.post('/complete', async (req, res) => {
  const parsed = CompleteSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  try {
    // Derive score from the authoritative game state
    const game = await getGame(parsed.data.gameId);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const state = game.state as MatchState;

    // Only allow completion of finished games
    if (state.phase !== 'FINISHED') {
      res.status(400).json({ error: 'Game is not finished' });
      return;
    }

    const currentLeg = state.legs[state.currentLegIndex];
    const finalScore = currentLeg?.players[0]?.score ?? 0;
    const turnsTaken = currentLeg?.turns.length ?? 0;

    await completeDailyAttempt(parsed.data.gameId, finalScore, turnsTaken);
    res.json({ success: true });
  } catch (error) {
    logError('Complete daily attempt failed', error);
    res.status(500).json({ error: 'Failed to complete daily attempt' });
  }
});

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// GET /api/daily/leaderboard - Get leaderboard for a given day
router.get('/leaderboard', async (req, res) => {
  try {
    const rawDate = typeof req.query.date === 'string' ? req.query.date : undefined;
    const dateStr = rawDate && DateSchema.safeParse(rawDate).success
      ? rawDate
      : new Date().toISOString().split('T')[0] as string;

    const challenge = await getChallengeByDate(dateStr);
    if (!challenge) {
      res.json({ entries: [] });
      return;
    }

    const entries = await getDailyLeaderboard(challenge.id);
    res.json({ entries });
  } catch (error) {
    logError('Get daily leaderboard failed', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// GET /api/daily/status - Check if user has played today
router.get('/status', async (req, res) => {
  try {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : null;
    const displayName = typeof req.query.displayName === 'string' ? req.query.displayName : null;

    if (!userId && !displayName) {
      res.status(400).json({ error: 'Either userId or displayName query parameter is required' });
      return;
    }

    const challenge = await getTodayChallenge();
    const result = await hasPlayedToday(challenge.id, userId, displayName ?? '');
    res.json(result);
  } catch (error) {
    logError('Check daily status failed', error);
    res.status(500).json({ error: 'Failed to check daily status' });
  }
});

export default router;
