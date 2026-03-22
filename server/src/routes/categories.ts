import { Router, type Router as RouterType } from 'express';
import { getAvailableCategories } from '../services/category-service.js';

const router: RouterType = Router();

// GET /api/categories
router.get('/', async (_req, res) => {
  try {
    const categories = await getAvailableCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Get categories failed:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router;
