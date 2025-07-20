import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Academic years endpoint' });
});

export default router; 