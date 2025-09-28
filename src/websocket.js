import { v4 as uuidv4 } from 'uuid';

const playerId = uuidv4();
const socket = new WebSocket('ws://localhost:8080');

socket.addEventListener('open', () => {
  console.log('Connected to WebSocket server');
});

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  console.log('Received message from server:', message);
});

socket.addEventListener('close', () => {
  console.log('Disconnected from WebSocket server');
});

export function sendPosition(x, y) {
  if (socket.readyState === WebSocket.OPEN) {
    const message = {
      type: 'move',
      playerId: playerId,
      x: x,
      y: y
    };
    socket.send(JSON.stringify(message));
  }
}