import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:4000', {
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(userId: string): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.emit('presence:init', userId);
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
