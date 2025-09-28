import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const wss = new WebSocketServer({ port: 8080 });

const clients = new Map();

wss.on('connection', ws => {
  const id = uuidv4();
  clients.set(ws, id);
  console.log(`Client ${id} connected`);

  ws.on('message', data => {
    const message = data.toString();
    console.log(`Received message from ${id}: ${message}`);
    // Broadcast the message to all other clients
    for (const [client, clientId] of clients.entries()) {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  });

  ws.on('close', () => {
    console.log(`Client ${clients.get(ws)} disconnected`);
    clients.delete(ws);
  });
});

console.log('WebSocket server started on port 8080');