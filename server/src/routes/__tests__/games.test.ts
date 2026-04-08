import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './test-app.js';

// ---------------------------------------------------------------------------
// Mock the database so db/index.ts never tries to connect (DATABASE_URL not
// available in test environments).  This must be declared before any module
// that transitively imports db/index.ts.
// ---------------------------------------------------------------------------
vi.mock('../../db/index.js', () => ({
  db: {},
}));

// ---------------------------------------------------------------------------
// Mock the service layer – routes must not touch the database
// ---------------------------------------------------------------------------
vi.mock('../../services/game-service.js', () => ({
  createGame: vi.fn(),
  submitGameAnswer: vi.fn(),
  handleGameTimeout: vi.fn(),
  getGame: vi.fn(),
}));

import {
  createGame,
  submitGameAnswer,
  handleGameTimeout,
  getGame,
} from '../../services/game-service.js';

// Typed mock helpers
const mockCreateGame = vi.mocked(createGame);
const mockSubmitGameAnswer = vi.mocked(submitGameAnswer);
const mockHandleGameTimeout = vi.mocked(handleGameTimeout);
const mockGetGame = vi.mocked(getGame);

// ---------------------------------------------------------------------------
// Shared fixture data
// ---------------------------------------------------------------------------

const VALID_CREATE_BODY = {
  targetScore: 501,
  matchFormat: 1,
  timerDuration: 30,
  enableBogeyNumbers: false,
  categoryId: 'premier-league-appearances',
  categoryName: 'Premier League Appearances',
  league: 'GB1',
  statType: 'APPEARANCES',
  player1Name: 'Alice',
  player2Name: 'Bob',
};

const MOCK_MATCH_STATE = {
  phase: 'PLAYING',
  currentLegIndex: 0,
  config: {
    id: 'game-uuid-1',
    targetScore: 501,
    matchFormat: 1,
    timerDuration: 30,
    enableBogeyNumbers: false,
    tiebreakerTarget: 101,
    statCategory: {
      id: 'premier-league-appearances',
      name: 'Premier League Appearances',
      league: 'GB1',
      team: null,
      statType: 'APPEARANCES',
    },
  },
  legs: [],
  legResults: [],
};

// ---------------------------------------------------------------------------
// POST /api/games
// ---------------------------------------------------------------------------

describe('POST /api/games', () => {
  const app = createTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with gameId and initial state for a valid request', async () => {
    mockCreateGame.mockResolvedValueOnce({
      gameId: 'game-uuid-1',
      state: MOCK_MATCH_STATE as never,
    });

    const res = await request(app)
      .post('/api/games')
      .send(VALID_CREATE_BODY)
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      gameId: 'game-uuid-1',
      state: { phase: 'PLAYING' },
    });
    expect(mockCreateGame).toHaveBeenCalledOnce();
    expect(mockCreateGame).toHaveBeenCalledWith(VALID_CREATE_BODY);
  });

  it('passes optional teamId through to the service', async () => {
    mockCreateGame.mockResolvedValueOnce({
      gameId: 'game-uuid-2',
      state: MOCK_MATCH_STATE as never,
    });

    const bodyWithTeam = { ...VALID_CREATE_BODY, teamId: 'team-123' };

    const res = await request(app)
      .post('/api/games')
      .send(bodyWithTeam)
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(mockCreateGame).toHaveBeenCalledWith(bodyWithTeam);
  });

  it('returns 400 when targetScore is missing', async () => {
    const { targetScore: _omit, ...body } = VALID_CREATE_BODY;

    const res = await request(app)
      .post('/api/games')
      .send(body)
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
    expect(res.body).toHaveProperty('details');
    expect(mockCreateGame).not.toHaveBeenCalled();
  });

  it('returns 400 when targetScore is not an integer', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ ...VALID_CREATE_BODY, targetScore: 'five-hundred-and-one' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
    expect(mockCreateGame).not.toHaveBeenCalled();
  });

  it('returns 400 when matchFormat is not an integer', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ ...VALID_CREATE_BODY, matchFormat: 'best-of-three' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
    expect(mockCreateGame).not.toHaveBeenCalled();
  });

  it('returns 400 when player1Name is an empty string', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ ...VALID_CREATE_BODY, player1Name: '' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
  });

  it('returns 400 when timerDuration is below the minimum of 5', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ ...VALID_CREATE_BODY, timerDuration: 4 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
  });

  it('returns 400 when timerDuration exceeds the maximum of 600', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ ...VALID_CREATE_BODY, timerDuration: 601 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
  });

  it('returns 400 when enableBogeyNumbers is not a boolean', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ ...VALID_CREATE_BODY, enableBogeyNumbers: 'yes' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
  });

  it('returns 500 when the service throws', async () => {
    mockCreateGame.mockRejectedValueOnce(new Error('DB unavailable'));

    const res = await request(app)
      .post('/api/games')
      .send(VALID_CREATE_BODY)
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to create game');
  });
});

// ---------------------------------------------------------------------------
// GET /api/games/:id
// ---------------------------------------------------------------------------

describe('GET /api/games/:id', () => {
  const app = createTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with state for an existing game', async () => {
    mockGetGame.mockResolvedValueOnce({
      state: MOCK_MATCH_STATE as never,
      status: 'playing',
    });

    const res = await request(app)
      .get('/api/games/game-uuid-1')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      state: { phase: 'PLAYING' },
      status: 'playing',
    });
    expect(mockGetGame).toHaveBeenCalledWith('game-uuid-1');
  });

  it('returns 404 when the game does not exist', async () => {
    mockGetGame.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/games/nonexistent-id')
      .set('Accept', 'application/json');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Game not found');
  });

  it('returns 500 when the service throws', async () => {
    mockGetGame.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(app)
      .get('/api/games/game-uuid-1')
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to get game');
  });
});

// ---------------------------------------------------------------------------
// POST /api/games/:id/answer
// ---------------------------------------------------------------------------

describe('POST /api/games/:id/answer', () => {
  const app = createTestApp();

  const VALID_ANSWER_BODY = {
    playerIndex: 0,
    footballerId: 'footballer-abc',
    footballerName: 'Wayne Rooney',
  };

  const MOCK_ANSWER_RESULT = {
    state: MOCK_MATCH_STATE,
    turnResult: 'VALID',
    statValue: 400,
    bustMessage: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with state, turnResult, statValue for a valid answer', async () => {
    mockSubmitGameAnswer.mockResolvedValueOnce(MOCK_ANSWER_RESULT as never);

    const res = await request(app)
      .post('/api/games/game-uuid-1/answer')
      .send(VALID_ANSWER_BODY)
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      turnResult: 'VALID',
      statValue: 400,
      bustMessage: null,
    });
    expect(mockSubmitGameAnswer).toHaveBeenCalledWith(
      'game-uuid-1',
      0,
      'footballer-abc',
      'Wayne Rooney',
    );
  });

  it('returns 200 when playerIndex is 1', async () => {
    mockSubmitGameAnswer.mockResolvedValueOnce(MOCK_ANSWER_RESULT as never);

    const res = await request(app)
      .post('/api/games/game-uuid-1/answer')
      .send({ ...VALID_ANSWER_BODY, playerIndex: 1 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(mockSubmitGameAnswer).toHaveBeenCalledWith(
      'game-uuid-1',
      1,
      'footballer-abc',
      'Wayne Rooney',
    );
  });

  it('returns 400 when footballerId is missing', async () => {
    const { footballerId: _omit, ...body } = VALID_ANSWER_BODY;

    const res = await request(app)
      .post('/api/games/game-uuid-1/answer')
      .send(body)
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
    expect(mockSubmitGameAnswer).not.toHaveBeenCalled();
  });

  it('returns 400 when footballerName is missing', async () => {
    const { footballerName: _omit, ...body } = VALID_ANSWER_BODY;

    const res = await request(app)
      .post('/api/games/game-uuid-1/answer')
      .send(body)
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
    expect(mockSubmitGameAnswer).not.toHaveBeenCalled();
  });

  it('returns 400 when playerIndex is 2 (out of range)', async () => {
    const res = await request(app)
      .post('/api/games/game-uuid-1/answer')
      .send({ ...VALID_ANSWER_BODY, playerIndex: 2 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
    expect(mockSubmitGameAnswer).not.toHaveBeenCalled();
  });

  it('returns 400 when playerIndex is -1 (out of range)', async () => {
    const res = await request(app)
      .post('/api/games/game-uuid-1/answer')
      .send({ ...VALID_ANSWER_BODY, playerIndex: -1 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
    expect(mockSubmitGameAnswer).not.toHaveBeenCalled();
  });

  it('returns 400 when footballerId is an empty string', async () => {
    const res = await request(app)
      .post('/api/games/game-uuid-1/answer')
      .send({ ...VALID_ANSWER_BODY, footballerId: '' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
  });

  it('returns 400 when the request body is completely empty', async () => {
    const res = await request(app)
      .post('/api/games/game-uuid-1/answer')
      .send({})
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
  });

  it('returns 500 when the service throws', async () => {
    mockSubmitGameAnswer.mockRejectedValueOnce(new Error('Game not found'));

    const res = await request(app)
      .post('/api/games/game-uuid-1/answer')
      .send(VALID_ANSWER_BODY)
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to submit answer');
  });
});

// ---------------------------------------------------------------------------
// POST /api/games/:id/timeout
// ---------------------------------------------------------------------------

describe('POST /api/games/:id/timeout', () => {
  const app = createTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with updated state when playerIndex is 0', async () => {
    mockHandleGameTimeout.mockResolvedValueOnce({
      state: MOCK_MATCH_STATE as never,
    });

    const res = await request(app)
      .post('/api/games/game-uuid-1/timeout')
      .send({ playerIndex: 0 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ state: { phase: 'PLAYING' } });
    expect(mockHandleGameTimeout).toHaveBeenCalledWith('game-uuid-1', 0);
  });

  it('returns 200 with updated state when playerIndex is 1', async () => {
    mockHandleGameTimeout.mockResolvedValueOnce({
      state: MOCK_MATCH_STATE as never,
    });

    const res = await request(app)
      .post('/api/games/game-uuid-1/timeout')
      .send({ playerIndex: 1 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(mockHandleGameTimeout).toHaveBeenCalledWith('game-uuid-1', 1);
  });

  it('returns 400 when playerIndex is missing', async () => {
    const res = await request(app)
      .post('/api/games/game-uuid-1/timeout')
      .send({})
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
    expect(mockHandleGameTimeout).not.toHaveBeenCalled();
  });

  it('returns 400 when playerIndex is 2', async () => {
    const res = await request(app)
      .post('/api/games/game-uuid-1/timeout')
      .send({ playerIndex: 2 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
    expect(mockHandleGameTimeout).not.toHaveBeenCalled();
  });

  it('returns 400 when playerIndex is a string', async () => {
    const res = await request(app)
      .post('/api/games/game-uuid-1/timeout')
      .send({ playerIndex: 'zero' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid request body');
    expect(mockHandleGameTimeout).not.toHaveBeenCalled();
  });

  it('returns 500 when the service throws', async () => {
    mockHandleGameTimeout.mockRejectedValueOnce(new Error('Game not found'));

    const res = await request(app)
      .post('/api/games/game-uuid-1/timeout')
      .send({ playerIndex: 0 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to handle timeout');
  });
});
