import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as jose from 'jose';
import { config } from '../config';
import { logger } from '../utils/logger';

const HEARTBEAT_INTERVAL_MS = 30_000;

interface AuthenticatedSocket extends WebSocket {
  userId: number;
  isAlive: boolean;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients = new Map<number, Set<AuthenticatedSocket>>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

  attach(server: http.Server): void {
    this.wss = new WebSocketServer({ noServer: true });
    this.jwks = jose.createRemoteJWKSet(
      new URL(`https://${config.auth0.domain}/.well-known/jwks.json`),
    );

    server.on('upgrade', (request, socket, head) => {
      this.handleUpgrade(request, socket, head).catch((err) => {
        logger.error({ err }, 'WebSocket upgrade error');
        socket.destroy();
      });
    });

    this.heartbeatTimer = setInterval(() => this.pruneStaleClients(), HEARTBEAT_INTERVAL_MS);
    logger.info('WebSocket service attached');
  }

  send<T>(userId: number, type: string, payload: T): void {
    const sockets = this.clients.get(userId);
    if (!sockets) return;
    const message = JSON.stringify({ type, payload });
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    }
  }

  broadcast<T>(userIds: number[], type: string, payload: T): void {
    for (const userId of userIds) this.send(userId, type, payload);
  }

  isConnected(userId: number): boolean {
    const sockets = this.clients.get(userId);
    if (!sockets) return false;
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  shutdown(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.wss) this.wss.close();
    this.clients.clear();
    logger.info('WebSocket service shut down');
  }

  private async handleUpgrade(
    request: http.IncomingMessage,
    socket: any,
    head: Buffer,
  ): Promise<void> {
    const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return; }

    try {
      const { payload } = await jose.jwtVerify(token, this.jwks!, {
        issuer: `https://${config.auth0.domain}/`,
        audience: config.auth0.audience,
      });
      const userId = parseInt(
        (payload as any).userId ?? (payload as any)['https://soulseer.com/userId'] ?? '0',
        10,
      );
      if (!userId) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return; }

      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        const authedWs = ws as AuthenticatedSocket;
        authedWs.userId = userId;
        authedWs.isAlive = true;
        this.addClient(authedWs);
        this.setupSocketHandlers(authedWs);
        this.wss!.emit('connection', authedWs, request);
      });
    } catch (err) {
      logger.debug({ err }, 'WebSocket auth failed');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  }

  private addClient(ws: AuthenticatedSocket): void {
    let sockets = this.clients.get(ws.userId);
    if (!sockets) { sockets = new Set(); this.clients.set(ws.userId, sockets); }
    sockets.add(ws);
    logger.debug({ userId: ws.userId }, 'WebSocket client connected');
  }

  private removeClient(ws: AuthenticatedSocket): void {
    const sockets = this.clients.get(ws.userId);
    if (sockets) { sockets.delete(ws); if (sockets.size === 0) this.clients.delete(ws.userId); }
    logger.debug({ userId: ws.userId }, 'WebSocket client disconnected');
  }

  private setupSocketHandlers(ws: AuthenticatedSocket): void {
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong', payload: {} }));
      } catch { /* ignore */ }
    });
    ws.on('close', () => this.removeClient(ws));
    ws.on('error', (err) => { logger.error({ userId: ws.userId, err }, 'WebSocket error'); this.removeClient(ws); });
  }

  private pruneStaleClients(): void {
    if (!this.wss) return;
    for (const [userId, sockets] of this.clients) {
      for (const ws of sockets) {
        if (!ws.isAlive) { ws.terminate(); sockets.delete(ws); continue; }
        ws.isAlive = false;
        ws.ping();
      }
      if (sockets.size === 0) this.clients.delete(userId);
    }
  }
}

export const wsService = new WebSocketService();
