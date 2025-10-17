import { removeOtherPlayer, updateOtherPlayer } from './otherPlayers.js';
import { setGamePoints, currentMapName, map } from './components/Map.js';
import { updatePlayerMoney } from './components/Player.js';
import { TreasureMap } from './components/TreasureMap.js';

let socket;
let playerId = null;
let reconnectTimer = null;
let pingInterval = null;

export function connect() {
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
        setGamePoints(message.gamePoints);
        const gameInitEvent = new CustomEvent('game-init', { detail: message });
        window.dispatchEvent(gameInitEvent);
        break;
      case 'newCoin':
        setGamePoints(message.gamePoints);
        // We might need a way to redraw the map or just the points
        break;
      case 'newPlayer':
        if (message.player.id !== playerId) {
          updateOtherPlayer(message.player);
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
      case 'playerUpdated':
        if (message.id !== playerId) {
          updateOtherPlayer(message);
        }
        break;
      case 'gamePointsUpdated':
        setGamePoints(message.gamePoints);
        break;
      case 'updateMoney':
        updatePlayerMoney(message.money);
        break;
      case 'newAdventure':
        // Clear existing treasure maps
        map.children.filter(c => c.name === 'treasureMap').forEach(c => map.remove(c));

        if (message.adventure.maps) {
          message.adventure.maps.forEach(mapLocation => {
            if (mapLocation.map === currentMapName) {
              const treasureMap = TreasureMap(mapLocation.x, mapLocation.y);
              treasureMap.name = 'treasureMap';
              map.add(treasureMap);
            }
          });
        }
        break;
      case 'treasureMapCollected':
        const mapId = `treasureMap_${message.map.map}_${message.map.x}_${message.map.y}`;
        localStorage.setItem(mapId, message.imageData);
        console.log(`Stored treasure map ${mapId} in localStorage.`);
        document.getElementById('show-maps-button').style.display = 'block';
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
      y: y,
      map: currentMapName
    };
    socket.send(JSON.stringify(message));
    localStorage.setItem('lastPosition', JSON.stringify({ x, y }));
  }
}

export function sendMessage(message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export function sendSettings(name, colour) {
  if (socket.readyState === WebSocket.OPEN) {
    const message = {
      type: 'settings',
      name: name,
      colour: colour
    };
    socket.send(JSON.stringify(message));
  }
}
