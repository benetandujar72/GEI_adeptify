import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger.js';

interface WebSocketMessage {
  type: string;
  data: any;
  userId?: string;
  instituteId?: string;
}

/**
 * Configura el servidor WebSocket
 */
export function setupWebSocket(wss: WebSocketServer): void {
  logger.info('🔌 Configurando WebSocket server...');

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.info(`🔗 Nueva conexión WebSocket desde ${clientIp}`);

    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
      type: 'connection',
      data: { message: 'Conectado al servidor GEI' }
    }));

    // Manejar mensajes entrantes
    ws.on('message', (message: string) => {
      try {
        const parsedMessage: WebSocketMessage = JSON.parse(message);
        handleWebSocketMessage(ws, parsedMessage);
      } catch (error) {
        logger.error('❌ Error al procesar mensaje WebSocket:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Error al procesar mensaje' }
        }));
      }
    });

    // Manejar desconexión
    ws.on('close', () => {
      logger.info(`🔌 Cliente desconectado: ${clientIp}`);
    });

    // Manejar errores
    ws.on('error', (error) => {
      logger.error('❌ Error en WebSocket:', error);
    });
  });

  // Broadcast a todos los clientes conectados
  wss.on('broadcast', (message: WebSocketMessage) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });

  logger.info('✅ WebSocket server configurado correctamente');
}

/**
 * Maneja los mensajes WebSocket entrantes
 */
function handleWebSocketMessage(ws: WebSocket, message: WebSocketMessage): void {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
      break;

    case 'subscribe':
      // Suscribir a notificaciones específicas
      ws.send(JSON.stringify({
        type: 'subscribed',
        data: { message: 'Suscrito a notificaciones' }
      }));
      break;

    case 'notification':
      // Procesar notificaciones
      logger.info('📢 Notificación recibida:', message.data);
      break;

    default:
      logger.warn('⚠️ Tipo de mensaje WebSocket no reconocido:', message.type);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Tipo de mensaje no reconocido' }
      }));
  }
}

/**
 * Envía una notificación a todos los clientes conectados
 */
export function broadcastNotification(message: string, data?: any): void {
  const notification: WebSocketMessage = {
    type: 'notification',
    data: { message, ...data }
  };

  // Broadcast a todos los clientes
  // Esto se implementaría usando el evento 'broadcast' del wss
} 