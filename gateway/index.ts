import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 5000;

// --- Middlewares de Seguridad ---
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));

// --- Reglas de Enrutamiento ---

// Por ahora, todas las peticiones a /api/ se redirigen al monolito actual
app.use('/api', createProxyMiddleware({
    target: process.env.API_SERVER_URL || 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // Reescribe la ruta para que no incluya /api
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[Gateway] Redirigiendo ${req.method} ${req.originalUrl} -> ${process.env.API_SERVER_URL || 'http://localhost:3000'}${proxyReq.path}`);
    },
    onError: (err, req, res) => {
        console.error('[Gateway] Error en el proxy:', err);
        res.status(500).send('Proxy Error');
    }
}));

// --- Health Check del Gateway ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Gateway is healthy' });
});

app.listen(PORT, () => {
    console.log(`🚀 API Gateway escuchando en el puerto ${PORT}`);
    console.log(`🎯 Redirigiendo tráfico de /api a ${process.env.API_SERVER_URL || 'http://localhost:3000'}`);
});
