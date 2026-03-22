import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './test-app.js';

// ---------------------------------------------------------------------------
// Mock the database so db/index.ts never tries to connect (DATABASE_URL not
// available in test environments).
// ---------------------------------------------------------------------------
vi.mock('../../db/index.js', () => ({
  db: {},
}));

// ---------------------------------------------------------------------------
// Mock the service layer
// ---------------------------------------------------------------------------
vi.mock('../../services/player-service.js', () => ({
  searchPlayers: vi.fn(),
  getPlayersForCategory: vi.fn(),
  getPlayerStat: vi.fn(),
}));

import { searchPlayers, getPlayersForCategory } from '../../services/player-service.js';

const mockSearchPlayers = vi.mocked(searchPlayers);
const mockGetPlayersForCategory = vi.mocked(getPlayersForCategory);

// ---------------------------------------------------------------------------
// Shared fixture data
// ---------------------------------------------------------------------------

const MOCK_SEARCH_RESULTS = [
  { id: 'p1', name: 'Wayne Rooney', nationality: 'English', position: 'FW' },
  { id: 'p2', name: 'Rooney Jr', nationality: 'English', position: 'MF' },
];

const MOCK_CATEGORY_PLAYERS = [
  {
    id: 'p3',
    name: 'Steven Gerrard',
    nationality: 'English',
    position: 'MF',
    statValue: 710,
    teamName: 'Liverpool',
  },
  {
    id: 'p4',
    name: 'Frank Lampard',
    nationality: 'English',
    position: 'MF',
    statValue: 648,
    teamName: 'Chelsea',
  },
];

// ---------------------------------------------------------------------------
// GET /api/players/search
// ---------------------------------------------------------------------------

describe('GET /api/players/search', () => {
  const app = createTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with players array for a valid query', async () => {
    mockSearchPlayers.mockResolvedValueOnce(MOCK_SEARCH_RESULTS);

    const res = await request(app)
      .get('/api/players/search?q=roon')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ players: MOCK_SEARCH_RESULTS });
    expect(mockSearchPlayers).toHaveBeenCalledWith('roon', undefined);
  });

  it('passes an explicit limit to the service', async () => {
    mockSearchPlayers.mockResolvedValueOnce(MOCK_SEARCH_RESULTS.slice(0, 1));

    const res = await request(app)
      .get('/api/players/search?q=roon&limit=1')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(mockSearchPlayers).toHaveBeenCalledWith('roon', 1);
  });

  it('returns an empty players array when no results are found', async () => {
    mockSearchPlayers.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/players/search?q=zzzz')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ players: [] });
  });

  it('returns 400 when the q parameter is missing', async () => {
    const res = await request(app)
      .get('/api/players/search')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Query must be at least 2 characters');
    expect(mockSearchPlayers).not.toHaveBeenCalled();
  });

  it('returns 400 when q is a single character', async () => {
    const res = await request(app)
      .get('/api/players/search?q=r')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Query must be at least 2 characters');
    expect(mockSearchPlayers).not.toHaveBeenCalled();
  });

  it('returns 400 when q is an empty string', async () => {
    const res = await request(app)
      .get('/api/players/search?q=')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Query must be at least 2 characters');
    expect(mockSearchPlayers).not.toHaveBeenCalled();
  });

  it('returns 400 when limit is 0', async () => {
    const res = await request(app)
      .get('/api/players/search?q=roon&limit=0')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Limit must be between 1 and 100');
    expect(mockSearchPlayers).not.toHaveBeenCalled();
  });

  it('returns 400 when limit exceeds 100', async () => {
    const res = await request(app)
      .get('/api/players/search?q=roon&limit=101')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Limit must be between 1 and 100');
    expect(mockSearchPlayers).not.toHaveBeenCalled();
  });

  it('returns 400 when limit is not a number', async () => {
    const res = await request(app)
      .get('/api/players/search?q=roon&limit=abc')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Limit must be between 1 and 100');
    expect(mockSearchPlayers).not.toHaveBeenCalled();
  });

  it('returns 200 with exactly 2-character query (boundary value)', async () => {
    mockSearchPlayers.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/players/search?q=ro')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(mockSearchPlayers).toHaveBeenCalledWith('ro', undefined);
  });

  it('handles special characters in the query string', async () => {
    mockSearchPlayers.mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/players/search?q=O'Brien")
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    // The apostrophe should have been forwarded to the service
    expect(mockSearchPlayers).toHaveBeenCalledWith("O'Brien", undefined);
  });

  it('returns 500 when the service throws', async () => {
    mockSearchPlayers.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/players/search?q=roon')
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to search players');
  });
});

// ---------------------------------------------------------------------------
// GET /api/players/category
// ---------------------------------------------------------------------------

describe('GET /api/players/category', () => {
  const app = createTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with players array for a valid league', async () => {
    mockGetPlayersForCategory.mockResolvedValueOnce(MOCK_CATEGORY_PLAYERS);

    const res = await request(app)
      .get('/api/players/category?league=GB1')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ players: MOCK_CATEGORY_PLAYERS });
    expect(mockGetPlayersForCategory).toHaveBeenCalledWith('GB1', undefined, undefined, undefined);
  });

  it('passes teamId, statType, and limit when provided', async () => {
    mockGetPlayersForCategory.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/players/category?league=GB1&teamId=team-abc&statType=GOALS&limit=20')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(mockGetPlayersForCategory).toHaveBeenCalledWith('GB1', 'team-abc', 'GOALS', 20);
  });

  it('returns an empty array when no players are found', async () => {
    mockGetPlayersForCategory.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/players/category?league=XX9')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ players: [] });
  });

  it('returns 400 when league is missing', async () => {
    const res = await request(app)
      .get('/api/players/category')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'League is required');
    expect(mockGetPlayersForCategory).not.toHaveBeenCalled();
  });

  it('returns 400 when limit is 0', async () => {
    const res = await request(app)
      .get('/api/players/category?league=GB1&limit=0')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Limit must be between 1 and 500');
    expect(mockGetPlayersForCategory).not.toHaveBeenCalled();
  });

  it('returns 400 when limit exceeds 500', async () => {
    const res = await request(app)
      .get('/api/players/category?league=GB1&limit=501')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Limit must be between 1 and 500');
    expect(mockGetPlayersForCategory).not.toHaveBeenCalled();
  });

  it('returns 400 when limit is not numeric', async () => {
    const res = await request(app)
      .get('/api/players/category?league=GB1&limit=many')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Limit must be between 1 and 500');
    expect(mockGetPlayersForCategory).not.toHaveBeenCalled();
  });

  it('returns 200 at the maximum limit boundary value of 500', async () => {
    mockGetPlayersForCategory.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/players/category?league=GB1&limit=500')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(mockGetPlayersForCategory).toHaveBeenCalledWith('GB1', undefined, undefined, 500);
  });

  it('returns 500 when the service throws', async () => {
    mockGetPlayersForCategory.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/players/category?league=GB1')
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to get players for category');
  });
});
