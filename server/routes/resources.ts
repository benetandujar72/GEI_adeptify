import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Resources endpoint' });
});

export default router; 