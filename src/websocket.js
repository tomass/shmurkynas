import { addOtherPlayer, removeOtherPlayer, updateOtherPlayer } from './otherPlayers.js';

let socket;
let playerId = null;
let reconnectTimer = null;
let pingInterval = null;

function connect() {
  playerId = localStorage.getItem('playerId') || null;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/smurkynas`;

  socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    console.log('Connected to WebSocket server');
    clearTimeout(reconnectTimer);

    if (playerId) {
      console.log('Resuming session with ID: ', playerId);
      socket.send(JSON.stringify({ type: 'resume', id: playerId }));
    } else {
      console.log('First connection, get ID');
      socket.send(JSON.stringify({ type: 'create' }));
    }

    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    console.log('Received message from server:', message);

    switch (message.type) {
      case 'init':
        playerId = message.id;
        localStorage.setItem('playerId', playerId);
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
    console.log('Disconnected from WebSocket server. Attempting to reconnect in 5 seconds...');
    clearInterval(pingInterval);
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 5000);
  });
}

export function sendPosition(x, y) {
  if (socket.readyState === WebSocket.OPEN) {
    const message = {
      type: 'move',
      x: x,
      y: y
    };
    socket.send(JSON.stringify(message));
    localStorage.setItem('lastPosition', JSON.stringify({ x, y }));
  }
}

connect();
