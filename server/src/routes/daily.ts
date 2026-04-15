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
import { getUserById } from '../services/auth-service.js';
import { authenticateRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { dailyChallengeAttempts } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { MatchState } from '../lib/game-engine/types.js';

const router: RouterType = Router();

const StartSchema = z.object({
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

// POST /api/daily/start - Start today's challenge (authenticated)
router.post('/start', async (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  try {
    // Load the authenticated user's canonical displayName (don't trust client)
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const challenge = await getTodayChallenge();
    const player2Name = parsed.data.player2Name;

    // Check if already played
    const status = await hasPlayedToday(challenge.id, userId, user.displayName);
    if (status.played && status.attemptId && status.gameId) {
      // Allow resuming an existing attempt
      const result = await startDailyAttempt(challenge.id, userId, user.displayName, player2Name);
      res.json(result);
      return;
    }

    const result = await startDailyAttempt(challenge.id, userId, user.displayName, player2Name);
    res.status(201).json(result);
  } catch (error) {
    logError('Start daily attempt failed', error);
    res.status(500).json({ error: 'Failed to start daily challenge' });
  }
});

// POST /api/daily/complete - Mark attempt as complete (authenticated, score derived server-side)
router.post('/complete', async (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  const parsed = CompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  try {
    // Check if a daily attempt exists for this game; if not, treat as no-op
    // (e.g. the finished game was a regular local/solo game, not a daily).
    const [attempt] = await db
      .select({ userId: dailyChallengeAttempts.userId })
      .from(dailyChallengeAttempts)
      .where(eq(dailyChallengeAttempts.gameId, parsed.data.gameId))
      .limit(1);

    if (!attempt) {
      res.json({ success: true, recorded: false });
      return;
    }

    // Ownership check: only the attempt owner may complete it
    if (attempt.userId !== userId) {
      res.status(403).json({ error: 'Not your daily attempt' });
      return;
    }

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

    const updated = await completeDailyAttempt(parsed.data.gameId, finalScore, turnsTaken);
    res.json({ success: true, recorded: updated });
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

// GET /api/daily/status - Check if the authenticated user has played today
router.get('/status', async (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  try {
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const challenge = await getTodayChallenge();
    const result = await hasPlayedToday(challenge.id, userId, user.displayName);
    res.json(result);
  } catch (error) {
    logError('Check daily status failed', error);
    res.status(500).json({ error: 'Failed to check daily status' });
  }
});

export default router;
