import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import {
  getTodayChallenge,
  startDailyAttempt,
  completeDailyAttempt,
  getDailyLeaderboard,
  hasPlayedToday,
  getChallengeByDate,
} from '../services/daily-service.js';

const router: RouterType = Router();

const StartSchema = z.object({
  displayName: z.string().min(1).max(30),
  userId: z.string().uuid().optional(),
});

const CompleteSchema = z.object({
  finalScore: z.number().int().min(0),
  turnsTaken: z.number().int().min(1),
});

// GET /api/daily/today - Get today's challenge info
router.get('/today', async (_req, res) => {
  try {
    const challenge = await getTodayChallenge();
    res.json({ challenge });
  } catch (error) {
    console.error('Get daily challenge failed:', error);
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

    // Check if already played
    const status = await hasPlayedToday(challenge.id, userId, parsed.data.displayName);
    if (status.played && status.attemptId && status.gameId) {
      // Allow resuming an existing attempt
      const result = await startDailyAttempt(challenge.id, userId, parsed.data.displayName);
      res.json(result);
      return;
    }

    const result = await startDailyAttempt(challenge.id, userId, parsed.data.displayName);
    res.status(201).json(result);
  } catch (error) {
    console.error('Start daily attempt failed:', error);
    res.status(500).json({ error: 'Failed to start daily challenge' });
  }
});

// POST /api/daily/:attemptId/complete - Mark attempt as complete
router.post('/:attemptId/complete', async (req, res) => {
  const { attemptId } = req.params;
  const parsed = CompleteSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  try {
    await completeDailyAttempt(attemptId, parsed.data.finalScore, parsed.data.turnsTaken);
    res.json({ success: true });
  } catch (error) {
    console.error('Complete daily attempt failed:', error);
    res.status(500).json({ error: 'Failed to complete daily attempt' });
  }
});

// GET /api/daily/leaderboard - Get leaderboard for a given day
router.get('/leaderboard', async (req, res) => {
  try {
    const dateStr = typeof req.query.date === 'string'
      ? req.query.date
      : new Date().toISOString().split('T')[0] as string;

    const challenge = await getChallengeByDate(dateStr);
    if (!challenge) {
      res.json({ entries: [] });
      return;
    }

    const entries = await getDailyLeaderboard(challenge.id);
    res.json({ entries });
  } catch (error) {
    console.error('Get daily leaderboard failed:', error);
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
    console.error('Check daily status failed:', error);
    res.status(500).json({ error: 'Failed to check daily status' });
  }
});

export default router;
