import { Router, type Router as RouterType } from 'express';
import playersRouter from './players.js';
import categoriesRouter from './categories.js';
import gamesRouter from './games.js';
import authRouter from './auth.js';
import dailyRouter from './daily.js';

const router: RouterType = Router();

router.use('/auth', authRouter);
router.use('/players', playersRouter);
router.use('/categories', categoriesRouter);
router.use('/games', gamesRouter);
router.use('/daily', dailyRouter);

export default router;
