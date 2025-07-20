import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Institutes endpoint' });
});

export default router; 