const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/authConfig');
const liveStockEvents = require('./live-stock/events');

class SocketService {
  constructor() {
    this.io = null;
    this.userConnections = new Map(); // userId -> Set<socketId>
    this.connectionCounts = new Map(); // ip -> count
  }

  validateStockSymbol(symbol) {
    return typeof symbol === 'string' && /^[A-Z0-9.-]+$/.test(symbol) && symbol.length <= 15;
  }

  // Extract token from auth/query/cookies
  getTokenFromHandshake(handshake) {
    // 1) Explicit auth field (preferred)
    if (handshake.auth?.token) return handshake.auth.token;
    // 2) Query param token
    if (handshake.query?.token) return handshake.query.token;
    // 3) Cookie named accessToken (supports httpOnly cookies set by server)
    const cookieHeader = handshake.headers?.cookie;
    if (cookieHeader) {
      const parts = cookieHeader.split(';').map(p => p.trim());
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k === 'accessToken' && v) return decodeURIComponent(v);
      }
    }
    return null;
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL || true  // Allow any origin in production
          : 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 10000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6,
      connectTimeout: 30000
    });

    // Rate limit connections per IP (basic guard)
    this.io.use((socket, next) => {
      const ip = socket.handshake.address;
      const current = this.connectionCounts.get(ip) || 0;
      if (current >= 20) {
        return next(new Error('Too many connections'));
      }
      this.connectionCounts.set(ip, current + 1);
      socket.on('disconnect', () => {
        const after = Math.max(0, (this.connectionCounts.get(ip) || 1) - 1);
        this.connectionCounts.set(ip, after);
      });
      next();
    });

    // Authenticate socket via JWT
    this.io.use((socket, next) => {
      try {
        const token = this.getTokenFromHandshake(socket.handshake);
        if (!token) return next(new Error('Authentication token required'));
        const decoded = jwt.verify(token, jwtSecret);
        socket.user = decoded;

        if (!this.userConnections.has(decoded.id)) {
          this.userConnections.set(decoded.id, new Set());
        }
        this.userConnections.get(decoded.id).add(socket.id);

        socket.on('disconnect', () => {
          const set = this.userConnections.get(decoded.id);
          if (set) {
            set.delete(socket.id);
            if (set.size === 0) this.userConnections.delete(decoded.id);
          }
        });

        next();
      } catch (err) {
        console.error('Socket auth error:', err.message);
        next(new Error('Authentication failed'));
      }
    });

    this.setupEventHandlers();
    return this.io;
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Emit event for new socket connection
      liveStockEvents.emit('newSocketConnection', socket);

      socket.on('joinStockRoom', (symbol, cb) => {
        if (!this.validateStockSymbol(symbol)) {
          cb?.({ success: false, error: 'Invalid stock symbol' });
          return;
        }
        socket.join(`stock-${symbol}`);
        cb?.({ success: true });
      });

      socket.on('leaveStockRoom', (symbol) => {
        if (this.validateStockSymbol(symbol)) {
          socket.leave(`stock-${symbol}`);
        }
      });
      
      // Handle request for top performers data
      socket.on('requestTopPerformers', () => {
        // This will be handled by the background updater which broadcasts the data
        console.log('Client requested top performers data');
      });

      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id} (${reason})`);
      });
    });
  }

  broadcastStockUpdate(symbol, data) {
    if (!this.validateStockSymbol(symbol)) {
      console.error('Invalid stock symbol for broadcast:', symbol);
      return;
    }
    this.io.to(`stock-${symbol}`).emit('stockUpdate', {
      symbol,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  emitToUser(userId, event, data) {
    const sockets = this.userConnections.get(userId);
    if (!sockets) return;
    sockets.forEach((socketId) => this.io.to(socketId).emit(event, data));
  }

  broadcast(event, data) {
    if (!this.io) return;
    this.io.emit(event, data);
  }
  
  broadcastEvent(event, data) {
    if (!this.io) return;
    this.io.emit(event, data);
  }
}

module.exports = new SocketService();
