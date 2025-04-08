
import { io, Socket } from 'socket.io-client';

// Detect if we're in a preview environment
const isPreviewEnvironment = 
  window.location.hostname.includes('lovableproject.com') || 
  window.location.hostname.includes('lovable.app');

// Use different server URL based on environment
const SERVER_URL = isPreviewEnvironment 
  ? '/api' // Will be proxied in production
  : 'http://localhost:3000';

class WhatsAppService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;
  private isPreviewMode: boolean = isPreviewEnvironment;

  constructor() {
    this.listeners = new Map([
      ['qrCode', new Set()],
      ['connectionStatus', new Set()],
      ['authenticated', new Set()],
      ['serverStatus', new Set()],
      ['error', new Set()],
    ]);
  }

  connect() {
    if (this.socket && this.socket.connected) return;
    
    // If in preview environment, emit fake server status
    if (this.isPreviewMode) {
      console.log('Running in preview mode - server connections simulated');
      setTimeout(() => {
        this.notifyListeners('error', { 
          message: 'Cannot connect to local servers in preview mode. This app requires a WhatsApp server running locally on your machine.'
        });
        this.notifyListeners('serverStatus', { nodeServer: false, pythonServer: false });
      }, 1000);
      return;
    }
    
    try {
      this.socket = io(SERVER_URL, {
        reconnectionAttempts: this.maxConnectionAttempts,
        timeout: 10000, // 10 seconds timeout
        transports: ['websocket', 'polling']
      });
      
      this.socket.on('connect', () => {
        console.log('Connected to WhatsApp server');
        this.connectionAttempts = 0;
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.connectionAttempts++;
        
        // Notify listeners about the connection error
        this.notifyListeners('error', { 
          message: 'Cannot connect to WhatsApp server. Please ensure the server is running.'
        });
        
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
          console.error('Max reconnection attempts reached, giving up');
          this.notifyListeners('serverStatus', { nodeServer: false, pythonServer: false });
        }
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
    } catch (error) {
      console.error('Error creating socket connection:', error);
      this.notifyListeners('error', { 
        message: 'Failed to initialize connection to WhatsApp server.'
      });
    }
  }

  initialize() {
    if (this.isPreviewMode) {
      console.log('Running in preview mode - WhatsApp initialization simulated');
      setTimeout(() => {
        this.notifyListeners('error', { 
          message: 'Cannot initialize WhatsApp in preview mode. This app requires a local WhatsApp server.'
        });
      }, 1000);
      return;
    }
    
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    
    if (this.socket) {
      this.socket.emit('initialize');
    }
  }

  startServers() {
    return new Promise<{nodeServer: boolean, pythonServer: boolean}>((resolve, reject) => {
      if (this.isPreviewMode) {
        console.log('Running in preview mode - server startup simulated');
        setTimeout(() => {
          this.notifyListeners('error', { 
            message: 'Cannot start servers in preview mode. Please run this application locally.'
          });
          reject(new Error('Cannot start servers in preview environment'));
        }, 1500);
        return;
      }
      
      if (!this.socket || !this.socket.connected) {
        this.connect();
      }
      
      if (this.socket) {
        // Set a timeout in case the server doesn't respond
        const timeoutId = setTimeout(() => {
          reject(new Error('Server start timeout'));
          this.notifyListeners('error', { 
            message: 'Server start timed out. Please check if the server application is installed correctly.'
          });
        }, 15000); // 15 seconds timeout
        
        // Wait for server status update
        const statusHandler = (status: {nodeServer: boolean, pythonServer: boolean}) => {
          clearTimeout(timeoutId);
          this.off('serverStatus', statusHandler);
          resolve(status);
        };
        
        // Listen for status update
        this.on('serverStatus', statusHandler);
        
        // Send start command
        this.socket.emit('startServers');
      } else {
        reject(new Error('Socket not connected'));
        this.notifyListeners('error', { 
          message: 'Cannot start servers: Socket not connected'
        });
      }
    });
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
    if (this.isPreviewMode) {
      return { isConnected: false };
    }
    
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
    if (this.isPreviewMode) {
      return { nodeServer: false, pythonServer: false };
    }
    
    try {
      const response = await fetch(`${SERVER_URL}/server-status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching server status:', error);
      return { nodeServer: false, pythonServer: false };
    }
  }
  
  isInPreviewMode() {
    return this.isPreviewMode;
  }
}

export const whatsAppService = new WhatsAppService();
