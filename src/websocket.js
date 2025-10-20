import { removeOtherPlayer, updateOtherPlayer } from './otherPlayers.js';
import { setGamePoints, currentMapName, map } from './components/Map.js';
import { updatePlayerMoney, playerData } from './components/Player.js';
import { TreasureMap } from './components/TreasureMap.js';

let socket;
let playerId = null;
let reconnectTimer = null;
let pingInterval = null;


function removeOldTreasureMaps(activeAdventures) {
  const storedMaps = Object.keys(localStorage).filter(key => key.startsWith('treasureMap_'));

  storedMaps.forEach(mapId => {
    if (!activeAdventures.some(advId => mapId.includes(advId))) {
      localStorage.removeItem(mapId);
      console.log(`Removed old treasure map ${mapId} from localStorage.`);
    }
  });

  const remainingMaps = Object.keys(localStorage).filter(key => key.startsWith('treasureMap_'));
  if (remainingMaps.length === 0) {
    document.getElementById('show-maps-button').style.display = 'none';
  } else {
    document.getElementById('show-maps-button').style.display = 'block';
  }
}

// This is called when a treasuer is found and we therefore know that all our maps
// for that adventure can be removed.
function removeTreasureMaps(adventureId) {
  const storedMaps = Object.keys(localStorage).filter(key => key.startsWith('treasureMap_'));

  storedMaps.forEach(mapId => {
    if (mapId.includes(`treasureMap_${adventureId}_`)) {
      localStorage.removeItem(mapId);
      console.log(`Removed collected treasure map ${mapId} from localStorage.`);
    }
  });
}

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
      case 'updateGamePoints':
        setGamePoints(message.gamePoints);
        break;
      case 'activeAdventures':
        removeOldTreasureMaps(message.adventures);
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
      case 'updateMoney':
        updatePlayerMoney(message.money);
        break;
      case 'treasureFound':
        console.log(`Congratulations! You found a treasure ${message.adventureId} worth ${message.award}!`);
        removeTreasureMaps(message.adventureId);
        break;
      case 'treasureMapCollected':
        const mapId = `treasureMap_${message.map.adventureId}_${message.map.id}`;
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
