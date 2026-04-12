import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import {
  createGame,
  submitGameAnswer,
  handleGameTimeout,
  getGame,
} from '../services/game-service.js';
import { authenticateRequest } from '../middleware/auth.js';

const router: RouterType = Router();

const CreateGameSchema = z.object({
  targetScore: z.number().int().min(101).max(1001),
  matchFormat: z.number().int().min(1).max(5),
  enableBogeyNumbers: z.boolean(),
  categoryId: z.string().min(1).max(100),
  categoryName: z.string().min(1).max(100),
  league: z.string().min(1).max(50),
  teamId: z.string().max(100).optional(),
  statType: z.string().min(1).max(50),
  player1Name: z.string().min(1).max(30),
  player2Name: z.string().min(1).max(30),
});

const SubmitAnswerSchema = z.object({
  playerIndex: z.union([z.literal(0), z.literal(1)]),
  footballerId: z.string().min(1).max(64),
  footballerName: z.string().min(1).max(100),
});

const TimeoutSchema = z.object({
  playerIndex: z.union([z.literal(0), z.literal(1)]),
});

// POST /api/games (authenticated)
router.post('/', async (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  const parsed = CreateGameSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  try {
    const result = await createGame(parsed.data);
    res.status(201).json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create game';
    console.error('Create game failed:', msg);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// GET /api/games/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const game = await getGame(id);

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    res.json(game);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to get game';
    console.error('Get game failed:', msg);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// POST /api/games/:id/answer (authenticated)
router.post('/:id/answer', async (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  const { id } = req.params;
  const parsed = SubmitAnswerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  try {
    const result = await submitGameAnswer(
      id,
      parsed.data.playerIndex,
      parsed.data.footballerId,
      parsed.data.footballerName,
    );
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to submit answer';
    console.error('Submit answer failed:', msg);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// POST /api/games/:id/timeout (authenticated)
router.post('/:id/timeout', async (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  const { id } = req.params;
  const parsed = TimeoutSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  try {
    const result = await handleGameTimeout(id, parsed.data.playerIndex);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to handle timeout';
    console.error('Handle timeout failed:', msg);
    res.status(500).json({ error: 'Failed to handle timeout' });
  }
});

export default router;
