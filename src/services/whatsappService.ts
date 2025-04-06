
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

class WhatsAppService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.listeners = new Map([
      ['qrCode', new Set()],
      ['connectionStatus', new Set()],
      ['authenticated', new Set()],
      ['serverStatus', new Set()],
    ]);
  }

  connect() {
    if (this.socket) return;

    this.socket = io(SERVER_URL);
    
    this.socket.on('connect', () => {
      console.log('Connected to WhatsApp server');
    });
    
    this.socket.on('qrCode', (data) => {
      this.notifyListeners('qrCode', data);
    });
    
    this.socket.on('connectionStatus', (data) => {
      this.notifyListeners('connectionStatus', data);
    });
    
    this.socket.on('authenticated', () => {
      this.notifyListeners('authenticated', null);
    });
    
    this.socket.on('serverStatus', (status) => {
      this.notifyListeners('serverStatus', status);
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from WhatsApp server');
    });
  }

  initialize() {
    if (!this.socket) this.connect();
    this.socket?.emit('initialize');
  }

  startServers() {
    // Emit an event to start both the Node.js and Python servers
    if (!this.socket) this.connect();
    this.socket?.emit('startServers');
    return this.getServerStatus();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private notifyListeners(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  async getStatus() {
    try {
      const response = await fetch(`${SERVER_URL}/status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      return { isConnected: false };
    }
  }

  async getServerStatus() {
    try {
      const response = await fetch(`${SERVER_URL}/server-status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching server status:', error);
      return { nodeServer: false, pythonServer: false };
    }
  }
}

export const whatsAppService = new WhatsAppService();
