class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 10000; // Max 10 seconds
    this.eventHandlers = new Map();
    
    // Use the global io object if available
    this.io = window.io || null;
  }

  connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    if (!this.io) {
      console.error('Socket.io client not loaded. Make sure you have included the socket.io client script.');
      return;
    }

    // Initialize socket connection using the global io object
    this.socket = this.io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      timeout: 20000,
    });

    // Connection established
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000; // Reset reconnect delay
      
      // Re-authenticate if user is logged in
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData?.id) {
        this.authenticate(userData.id);
      }
      
      // Re-join rooms if needed
      const joinedRooms = JSON.parse(sessionStorage.getItem('socketRooms') || '[]');
      joinedRooms.forEach(room => this.joinRoom(room));
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.connected = false;
      this.handleReconnect();
    });

    // Disconnected
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.connected = false;
      
      if (reason === 'io server disconnect') {
        // The disconnection was initiated by the server, you need to reconnect manually
        this.socket.connect();
      }
      // else the socket will automatically try to reconnect
    });

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      console.log(`Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
    });

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to server');
      this.connected = false;
    });

    // Set up event listeners for custom events
    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      console.log('Disconnected from WebSocket server');
    }
  }

  authenticate(userId) {
    if (this.socket && this.connected) {
      this.socket.emit('authenticate', userId);
      console.log('Authentication sent for user:', userId);
    }
  }

  joinRoom(room) {
    if (this.socket && this.connected) {
      this.socket.emit('joinRoom', room);
      
      // Track joined rooms in session storage
      const joinedRooms = new Set(JSON.parse(sessionStorage.getItem('socketRooms') || '[]'));
      joinedRooms.add(room);
      sessionStorage.setItem('socketRooms', JSON.stringify([...joinedRooms]));
      
      console.log('Joined room:', room);
    }
  }

  leaveRoom(room) {
    if (this.socket && this.connected) {
      this.socket.emit('leaveRoom', room);
      
      // Update joined rooms in session storage
      const joinedRooms = new Set(JSON.parse(sessionStorage.getItem('socketRooms') || '[]'));
      joinedRooms.delete(room);
      sessionStorage.setItem('socketRooms', JSON.stringify([...joinedRooms]));
      
      console.log('Left room:', room);
    }
  }

  on(event, callback) {
    if (this.socket) {
      // Store the callback for later removal if needed
      const wrapper = (data) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      };
      
      this.socket.on(event, wrapper);
      
      // Store the original callback and wrapper for removal
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, new Map());
      }
      this.eventHandlers.get(event).set(callback, wrapper);
    }
  }

  off(event, callback) {
    if (this.socket && this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      if (handlers.has(callback)) {
        this.socket.off(event, handlers.get(callback));
        handlers.delete(callback);
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit event: WebSocket not connected');
    }
  }

  setupEventListeners() {
    // Example of setting up default event listeners
    this.on('connect', () => {
      console.log('Socket connected');
      // Add any default event handlers here
    });

    // Handle stock updates
    this.on('stockUpdate', (data) => {
      console.log('Received stock update:', data);
      // Dispatch a custom event that other parts of the app can listen to
      const event = new CustomEvent('stockUpdate', { detail: data });
      window.dispatchEvent(event);
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
      console.log(`Attempting to reconnect in ${delay}ms...`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }
}

// Create and export a singleton instance
const socketService = new SocketService();
export default socketService;
