import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Guards endpoint' });
});

export default router; 