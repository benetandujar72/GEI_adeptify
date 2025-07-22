import { Router } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

// Login
router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint' });
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout endpoint' });
});

// Register
router.post('/register', (req, res) => {
  res.json({ message: 'Register endpoint' });
});

// Get current user
router.get('/me', (req, res) => {
  try {
    logger.info('Auth /me endpoint called');
    
    // Por ahora, devolver null para indicar que no hay usuario autenticado
    // Esto permitirá que la aplicación cargue sin problemas
    res.json({ 
      user: null,
      authenticated: false,
      message: 'No user authenticated'
    });
  } catch (error) {
    logger.error('Error in /me endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 