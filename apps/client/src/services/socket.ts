import { io, Socket } from 'socket.io-client';
import type { EventsResult } from '../types';
import { API_URL } from './constants';

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(API_URL, {
        withCredentials: true
      });

      this.socket.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onCalendarUpdate(callback: (data: EventsResult) => void) {
    this.socket?.on('calendar-update', callback);
  }

  offCalendarUpdate(callback: (data: EventsResult) => void) {
    this.socket?.off('calendar-update', callback);
  }
}

export const socketService = SocketService.getInstance();