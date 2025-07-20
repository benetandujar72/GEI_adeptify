import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Attendance endpoint' });
});

export default router; 