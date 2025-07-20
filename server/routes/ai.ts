import { Router } from 'express';

const router = Router();

router.post('/chat', (req, res) => {
  res.json({ message: 'AI chat endpoint' });
});

export default router; 