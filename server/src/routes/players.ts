import { Router, type Router as RouterType } from 'express';
import { searchPlayers, searchPlayersInCategory, getPlayersForCategory, getDistinctSeasons, getPlayersForSeason } from '../services/player-service.js';
import { logError } from '../lib/log-error.js';

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
    logError('Player search failed', error);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

// GET /api/players/search-category?q=rooney&league=Premier+League&statType=GOALS&limit=15
router.get('/search-category', async (req, res) => {
  const query = req.query.q as string | undefined;
  const league = req.query.league as string | undefined;
  const teamId = req.query.teamId as string | undefined;
  const statType = req.query.statType as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

  if (!query || query.length < 1) {
    res.status(400).json({ error: 'Query is required' });
    return;
  }

  if (!league) {
    res.status(400).json({ error: 'League is required' });
    return;
  }

  if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 50)) {
    res.status(400).json({ error: 'Limit must be between 1 and 50' });
    return;
  }

  try {
    const players = await searchPlayersInCategory(query, league, teamId, statType, limit);
    res.json({ players });
  } catch (error) {
    logError('Search players in category failed', error);
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
    logError('Get players for category failed', error);
    res.status(500).json({ error: 'Failed to get players for category' });
  }
});

// GET /api/players/seasons?league=Premier+League&teamId=xxx
router.get('/seasons', async (req, res) => {
  const league = req.query.league as string | undefined;
  const teamId = req.query.teamId as string | undefined;

  if (!league) {
    res.status(400).json({ error: 'League is required' });
    return;
  }

  try {
    const seasons = await getDistinctSeasons(league, teamId);
    res.json({ seasons });
  } catch (error) {
    logError('Get distinct seasons failed', error);
    res.status(500).json({ error: 'Failed to get seasons' });
  }
});

// GET /api/players/season-players?season=2003/04&league=Premier+League&statType=APPEARANCES_AND_GOALS
router.get('/season-players', async (req, res) => {
  const season = req.query.season as string | undefined;
  const league = req.query.league as string | undefined;
  const teamId = req.query.teamId as string | undefined;
  const statType = req.query.statType as string | undefined;

  if (!season || !league) {
    res.status(400).json({ error: 'Season and league are required' });
    return;
  }

  try {
    const players = await getPlayersForSeason(season, league, teamId, statType);
    res.json({ players });
  } catch (error) {
    logError('Get players for season failed', error);
    res.status(500).json({ error: 'Failed to get players for season' });
  }
});

export default router;
