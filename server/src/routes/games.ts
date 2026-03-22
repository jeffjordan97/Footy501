import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import {
  createGame,
  submitGameAnswer,
  handleGameTimeout,
  getGame,
} from '../services/game-service.js';

const router: RouterType = Router();

const CreateGameSchema = z.object({
  targetScore: z.number().int(),
  matchFormat: z.number().int(),
  timerDuration: z.number().int().min(5).max(600),
  enableBogeyNumbers: z.boolean(),
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  league: z.string().min(1),
  teamId: z.string().optional(),
  statType: z.string().min(1),
  player1Name: z.string().min(1),
  player2Name: z.string().min(1),
});

const SubmitAnswerSchema = z.object({
  playerIndex: z.union([z.literal(0), z.literal(1)]),
  footballerId: z.string().min(1),
  footballerName: z.string().min(1),
});

const TimeoutSchema = z.object({
  playerIndex: z.union([z.literal(0), z.literal(1)]),
});

// POST /api/games
router.post('/', async (req, res) => {
  const parsed = CreateGameSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  try {
    const result = await createGame(parsed.data);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create game failed:', error);
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
    console.error('Get game failed:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// POST /api/games/:id/answer
router.post('/:id/answer', async (req, res) => {
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
    console.error('Submit answer failed:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// POST /api/games/:id/timeout
router.post('/:id/timeout', async (req, res) => {
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
    console.error('Handle timeout failed:', error);
    res.status(500).json({ error: 'Failed to handle timeout' });
  }
});

export default router;
