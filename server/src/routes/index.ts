import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';
import playersRouter from './players.js';
import categoriesRouter from './categories.js';
import gamesRouter from './games.js';
import authRouter from './auth.js';
import dailyRouter from './daily.js';

const router: RouterType = Router();

// Stricter rate limits for auth endpoints: 10 per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

router.use('/auth/guest', authLimiter);
router.use('/auth/google', authLimiter);
router.use('/auth/token-exchange', authLimiter);

router.use('/auth', authRouter);
router.use('/players', playersRouter);
router.use('/categories', categoriesRouter);
router.use('/games', gamesRouter);
router.use('/daily', dailyRouter);

export default router;
