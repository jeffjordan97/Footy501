import { Router, type Router as RouterType } from 'express';
import { searchPlayers, getPlayersForCategory } from '../services/player-service.js';

const router: RouterType = Router();

// GET /api/players/search?q=rooney&limit=10
router.get('/search', async (req, res) => {
  const query = req.query.q as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

  if (!query || query.length < 2) {
    res.status(400).json({ error: 'Query must be at least 2 characters' });
    return;
  }

  if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
    res.status(400).json({ error: 'Limit must be between 1 and 100' });
    return;
  }

  try {
    const players = await searchPlayers(query, limit);
    res.json({ players });
  } catch (error) {
    console.error('Player search failed:', error);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

// GET /api/players/category?league=GB1&teamId=xxx&statType=APPEARANCES&limit=50
router.get('/category', async (req, res) => {
  const league = req.query.league as string | undefined;
  const teamId = req.query.teamId as string | undefined;
  const statType = req.query.statType as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

  if (!league) {
    res.status(400).json({ error: 'League is required' });
    return;
  }

  if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 500)) {
    res.status(400).json({ error: 'Limit must be between 1 and 500' });
    return;
  }

  try {
    const players = await getPlayersForCategory(league, teamId, statType, limit);
    res.json({ players });
  } catch (error) {
    console.error('Get players for category failed:', error);
    res.status(500).json({ error: 'Failed to get players for category' });
  }
});

export default router;
