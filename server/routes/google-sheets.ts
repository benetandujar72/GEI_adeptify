// COMPLETAMENTE DESHABILITADO - Google Sheets
// Se reactivará cuando se configuren las variables de entorno

import { Router } from 'express';
const router = Router();

// Endpoint de estado simple
router.get('/status', (req, res) => {
  res.json({ 
    status: 'disabled',
    message: 'Google Sheets completamente deshabilitado. Se reactivará cuando se configuren las variables de entorno.'
  });
});

// Endpoint catch-all para cualquier ruta de Google Sheets
router.all('*', (req, res) => {
  res.status(503).json({ 
    status: 'disabled',
    message: 'Google Sheets completamente deshabilitado',
    path: req.path
  });
});

export default router; 