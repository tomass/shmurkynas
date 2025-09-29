import { addOtherPlayer, removeOtherPlayer, updateOtherPlayer } from './otherPlayers.js';

let playerId = null;
const socket = new WebSocket('wss://dev.openmap.lt/smurkynas');

socket.addEventListener('open', () => {
  console.log('Connected to WebSocket server');
});

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  console.log('Received message from server:', message);

  switch (message.type) {
    case 'init':
      playerId = message.id;
      const gameInitEvent = new CustomEvent('game-init', { detail: message });
      window.dispatchEvent(gameInitEvent);
      break;
    case 'newPlayer':
      if (message.player.id !== playerId) {
        addOtherPlayer(message.player);
      }
      break;
    case 'playerMoved':
      if (message.id !== playerId) {
        updateOtherPlayer(message);
      }
      break;
    case 'playerDisconnected':
      if (message.id !== playerId) {
        removeOtherPlayer(message.id);
      }
      break;
  }
});

socket.addEventListener('close', () => {
  console.log('Disconnected from WebSocket server');
});

export function sendPosition(x, y) {
  if (socket.readyState === WebSocket.OPEN) {
    const message = {
      type: 'move',
      x: x,
      y: y
    };
    socket.send(JSON.stringify(message));
  }
}