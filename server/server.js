import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const wss = new WebSocketServer({ port: 8088 });

const players = new Map();

function logWithTimestamp(message) {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
  console.log(`${timestamp} ${message}`);
}

wss.on('connection', ws => {
  const id = uuidv4();
  const x = Math.floor(Math.random() * 5) + 2;
  const y = Math.floor(Math.random() * 5) + 2;

  // Get current players before adding the new one
  const allPlayers = Array.from(players.values()).map(p => ({ id: p.id, x: p.x, y: p.y }));

  // Send initialization data to the new client
  ws.send(JSON.stringify({ type: 'init', id, x, y, players: allPlayers }));

  // Add the new player to the server state
  const playerState = { id, ws, x, y };
  players.set(id, playerState);
  logWithTimestamp(`Client ${id} connected at (${x}, ${y})`);

  // Notify all other players about the new player
  const newPlayerMessage = JSON.stringify({ type: 'newPlayer', player: { id, x, y } });
  for (const [playerId, player] of players.entries()) {
    if (player.id !== id && player.ws.readyState === player.ws.OPEN) {
      player.ws.send(newPlayerMessage);
    }
  }

  ws.on('message', data => {
    const message = JSON.parse(data.toString());
    logWithTimestamp(`Received message from ${id}:`, message);

    if (message.type === 'move') {
      const player = players.get(id);
      if (player) {
        player.x = message.x;
        player.y = message.y;

        // Broadcast the move to all other clients
        const moveMessage = JSON.stringify({ type: 'playerMoved', id, x: message.x, y: message.y });
        for (const [pId, p] of players.entries()) {
          if (pId !== id && p.ws.readyState === p.ws.OPEN) {
            p.ws.send(moveMessage);
          }
        }
      }
    }
  });

  ws.on('close', () => {
    logWithTimestamp(`Client ${id} disconnected`);
    players.delete(id);
    const disconnectMessage = JSON.stringify({ type: 'playerDisconnected', id });
    for (const [playerId, player] of players.entries()) {
      if (player.ws.readyState === player.ws.OPEN) {
        player.ws.send(disconnectMessage);
      }
    }
  });
});

logWithTimestamp('WebSocket server started on port 8088');
