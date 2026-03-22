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
vi.mock('../../services/category-service.js', () => ({
  getAvailableCategories: vi.fn(),
}));

import { getAvailableCategories } from '../../services/category-service.js';

const mockGetAvailableCategories = vi.mocked(getAvailableCategories);

// ---------------------------------------------------------------------------
// Shared fixture data
// ---------------------------------------------------------------------------

const MOCK_CATEGORIES = [
  {
    id: 'premier-league-appearances',
    name: 'Premier League Appearances',
    league: 'GB1',
    leagueName: 'Premier League',
    teamId: null,
    teamName: null,
    statType: 'APPEARANCES',
  },
  {
    id: 'premier-league-goals',
    name: 'Premier League Goals',
    league: 'GB1',
    leagueName: 'Premier League',
    teamId: null,
    teamName: null,
    statType: 'GOALS',
  },
  {
    id: 'premier-league-arsenal-appearances',
    name: 'Arsenal Premier League Appearances',
    league: 'GB1',
    leagueName: 'Premier League',
    teamId: 'arsenal',
    teamName: 'Arsenal',
    statType: 'APPEARANCES',
  },
];

// ---------------------------------------------------------------------------
// GET /api/categories
// ---------------------------------------------------------------------------

describe('GET /api/categories', () => {
  const app = createTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with a categories array', async () => {
    mockGetAvailableCategories.mockResolvedValueOnce(MOCK_CATEGORIES);

    const res = await request(app)
      .get('/api/categories')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ categories: MOCK_CATEGORIES });
    expect(mockGetAvailableCategories).toHaveBeenCalledOnce();
  });

  it('returns 200 with an empty array when no categories exist', async () => {
    mockGetAvailableCategories.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/categories')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ categories: [] });
  });

  it('includes the correct fields on each category object', async () => {
    mockGetAvailableCategories.mockResolvedValueOnce(MOCK_CATEGORIES);

    const res = await request(app)
      .get('/api/categories')
      .set('Accept', 'application/json');

    const first = res.body.categories[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('league');
    expect(first).toHaveProperty('leagueName');
    expect(first).toHaveProperty('statType');
    // teamId and teamName are nullable
    expect(first).toHaveProperty('teamId');
    expect(first).toHaveProperty('teamName');
  });

  it('returns categories for multiple leagues', async () => {
    const multiLeagueCategories = [
      ...MOCK_CATEGORIES,
      {
        id: 'la-liga-appearances',
        name: 'La Liga Appearances',
        league: 'ES1',
        leagueName: 'La Liga',
        teamId: null,
        teamName: null,
        statType: 'APPEARANCES',
      },
    ];
    mockGetAvailableCategories.mockResolvedValueOnce(multiLeagueCategories);

    const res = await request(app)
      .get('/api/categories')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(4);
    const leagues = res.body.categories.map((c: { league: string }) => c.league);
    expect(leagues).toContain('GB1');
    expect(leagues).toContain('ES1');
  });

  it('returns 500 when the service throws', async () => {
    mockGetAvailableCategories.mockRejectedValueOnce(new Error('DB connection failed'));

    const res = await request(app)
      .get('/api/categories')
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to get categories');
  });
});
