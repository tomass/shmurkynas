import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs} from 'fs';

const wss = new WebSocketServer({ port: 8088 });
const PLAYERS_FILE = './players.json';

const players = new Map();

function logWithTimestamp(...args) {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
  console.log(`${timestamp}`, ...args);
}

function dateNow() {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
  return timestamp;
}

// Save all players to file
async function savePlayers() {
  const playersData = Array.from(players.values()).map(p => ({
    id: p.id,
    x: p.x,
    y: p.y,
    status: p.status,
    lastAction: p.lastAction,
    // Don't store WebSocket objects as they can't be serialized
  }));
  await fs.writeFile(PLAYERS_FILE, JSON.stringify(playersData, null, 2));
}

let saveDebounce;
function debouncedSave() {
  clearTimeout(saveDebounce);
  saveDebounce = setTimeout(savePlayers, 10000); // Save every 1s max
}

// Load players from file on startup
async function loadPlayers() {
  try {
    const data = await fs.readFile(PLAYERS_FILE, 'utf8');
    const playersData = JSON.parse(data);

    // Recreate player entries (without WebSocket connections)
    playersData.forEach(player => {
      players.set(player.id, {
        ...player,
        ws: null, // We'll set this when players reconnect
        status: 'inactive' // mark inactive until they re-connect
      });
    });

    logWithTimestamp(`Loaded ${playersData.length} players from file`);
  } catch (err) {
    if (err.code !== 'ENOENT') { // Ignore if file doesn't exist
      logWithTimestamp('Error loading players:', err);
    }
  }
}

function broadcastToOthers(senderId, message) {
  for (const [playerId, player] of players.entries()) {
    if (playerId !== senderId &&
        player.status === 'active' &&
        player.ws?.readyState === player.ws.OPEN) {
      player.ws.send(message);
    }
  }
}

wss.on('connection', async ws => {
  if (players.size === 0) {
    await loadPlayers();
  }
  let id;

  ws.on('message', data => {
    const message = JSON.parse(data.toString());
    logWithTimestamp(`Received message from player:`, message);

    // Get current players before adding the new one
    let allPlayers = Array.from(players.values())
      .filter(p => p.status === 'active') // only active players
      .map(p => ({ id: p.id, x: p.x, y: p.y }));
    if (message.type === 'resume') {
      if (message.id) {
        id = message.id;
        const existingPlayer = players.get(id);
        let x;
        let y;
        if (existingPlayer) {
          x = existingPlayer.x;
          y = existingPlayer.y;
          existingPlayer.ws = ws;
          existingPlayer.status = 'active';
          existingPlayer.lastAction = dateNow();
          debouncedSave();
        } else {
          logWithTimestamp('Could not find record for player with ${id}');
          x = 5;
          y = 5; // Check that player is not placed on top of another player
          const playerState = { id, ws, x, y, status: 'active', lastAction: dateNow() };
          players.set(id, playerState);
          debouncedSave();
        }
      }
      // Send initialization data to the new client
      ws.send(JSON.stringify({ type: 'init', id, x, y, players: allPlayers, lastAction: dateNow() }));
    } else if (message.type === 'create') {
      id = uuidv4();
      const x = 3;
      const y = 3; // TODO: calculate empty position!
      // Send initialization data to the new client
      ws.send(JSON.stringify({ type: 'init', id, x, y, players: allPlayers }));
      // Add the new player to the server state
      const playerState = { id, ws, x, y, status: 'active', lastAction: dateNow() };
      players.set(id, playerState);
      debouncedSave();
      logWithTimestamp(`New player ${id} connected at (${x}, ${y})`);

    } else if (message.type === 'move') {
      const player = players.get(id);
      if (player) {
        player.x = message.x;
        player.y = message.y;
        player.status = 'active';
        player.lastAction = dateNow();
        debouncedSave();

        // Broadcast the move to all other clients
        const moveMessage = JSON.stringify({ type: 'playerMoved', id, x: message.x, y: message.y });
        broadcastToOthers(id, moveMessage);
      }

      if (message.type === 'resume' || message.type === 'create') {
        // if old player has connected again or a new player has connected, inform other players

        // Get current players before adding the new one
        allPlayers = Array.from(players.values())
          .filter(p => p.status === 'active') // only active players
          .map(p => ({ id: p.id, x: p.x, y: p.y }));

        // Notify all other players about the new player
        const newPlayerMessage = JSON.stringify({ type: 'newPlayer', player: { id, x, y } });
        broadcastToOthers(id, newPlayerMessage);
      }
    } else if (message.type === 'ping') {
      const player = players.get(id);
      if (player) {
        player.status = 'active';
        player.lastAction = dateNow();
        debouncedSave();
      }
    }
  });

  ws.on('close', () => {
    logWithTimestamp(`Client ${id} disconnected`);
    const player = players.get(id);
    if (player) {
      player.status = 'inactive';
      player.ws = null; // web socket session is no longer alive
      player.lastAction = dateNow();
    }
    debouncedSave();
    const disconnectMessage = JSON.stringify({ type: 'playerDisconnected', id });
    broadcastToOthers(id, disconnectMessage);
  });
});

logWithTimestamp('WebSocket server started on port 8088');
