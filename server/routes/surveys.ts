import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Surveys endpoint' });
});

export default router; 