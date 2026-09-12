import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'fs';
import { parseMapData } from '../shared/mapParser.js';
import { generateMapImage } from './mapGenerator.js';
import { coinStartTime, coinEndTime, maxCoins, coinAppearanceProbability, coinAppearanceInterval, adventureAppearanceInterval, adventureAbandonInterval } from '../src/constants.js';
import { findTile } from '../src/utilies/findTile.js';
import { initialiseMapData } from '../src/components/Map.js';

const wss = new WebSocketServer({ port: 8088 });
const PLAYERS_FILE = './players.json';
const GAMEPOINTS_FILE = './gamePoints.json';
const ADVENTURES_FILE = './adventures.json';

const players = new Map();
let maps = {};
let serverGamePoints = []; // all game points (comming not from a map) - coins, treasure maps.
let adventures = [];

function shortUUID() {
  return Math.random().toString(36).substring(2, 10);
}

// Load map data on server startup
async function loadMapData() {
    try {
        const mapText = await fs.readFile('./public/base.map', 'utf8');
        maps = parseMapData(mapText);
        initialiseMapData(maps);
        logWithTimestamp('Map data loaded successfully.');
    } catch (error) {
        logWithTimestamp('Error loading map data:', error);
    }
}

function dateNow() {
  const now = new Date();
  const pad = (num) => num.toString().padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  const formattedLocalTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  return formattedLocalTime;
}

// Parses a timestamp produced by dateNow() back into a Date. Returns null if
// the text is missing or malformed.
function parseDate(text) {
  if (typeof text !== 'string') {
    return null;
  }
  const parts = text.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!parts) {
    return null;
  }
  const [, year, month, day, hours, minutes, seconds] = parts.map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export function logWithTimestamp(...args) {
  console.log(dateNow(), ...args);
}

function getRandomName() {
  const names = ["Pimpančkiukas", "Labubas", "Barbė", "Trampampyrius", "Raganaitė", "Mokytoja"];
    const availableNames = names.filter(name =>
        !Array.from(players.values()).some(player => player.name === name)
    );

    if (availableNames.length === 0) {
        // All names already used, so lets use fallback name
        return 'Bevardis';
    }

    const randomIndex = Math.floor(Math.random() * availableNames.length);
    return availableNames[randomIndex];
}

// Save all players to file
async function savePlayers() {
  const playersData = Array.from(players.values()).map(p => ({
    id: p.id,
    x: p.x,
    y: p.y,
    map: p.map,
    name: p.name,
    money: p.money,
    education: p.education,
    colour: p.colour,
    status: p.status,
    lastAction: p.lastAction,
    collectedMaps: p.collectedMaps || [],
    // Don't store WebSocket objects as they can't be serialized
  }));

  // Sort players by lastAction (newest first) as strings
  playersData.sort((a, b) => b.lastAction.localeCompare(a.lastAction));

  await fs.writeFile(PLAYERS_FILE, JSON.stringify(playersData, null, 2));
}

// Save all game points to file
async function saveGamePoints() {
  await fs.writeFile(GAMEPOINTS_FILE, JSON.stringify(serverGamePoints, null, 2));
}

// Save all adventures to file
async function saveAdventures() {
  await fs.writeFile(ADVENTURES_FILE, JSON.stringify(adventures, null, 2));
}

let saveDebounce;
function debouncedSave() {
  clearTimeout(saveDebounce);
  saveDebounce = setTimeout(savePlayers, 10000); // Save every 1s max
}

let saveGamePointsDebounce;
function debouncedGamePointsSave() {
  clearTimeout(saveGamePointsDebounce);
  saveGamePointsDebounce = setTimeout(saveGamePoints, 10000); // Save every 1s max
}

let saveAdventuresDebounce;
function debouncedAdventuresSave() {
  clearTimeout(saveAdventuresDebounce);
  saveAdventuresDebounce = setTimeout(saveAdventures, 10000); // Save every 1s max
}

// Load players from file on startup
async function loadPlayers() {
  try {
    const data = await fs.readFile(PLAYERS_FILE, 'utf8');
    const playersData = JSON.parse(data);

    // Recreate player entries (without WebSocket connections)
    playersData.forEach(player => {
      // Validate and set default for 'money'
      if (typeof player.money !== 'number' || isNaN(player.money)) {
        logWithTimestamp(`Warning: Invalid or missing 'money' for player ${player.id}. Resetting to 0.`);
        player.money = 0;
      }

      players.set(player.id, {
        ...player,
        ws: null, // We'll set this when players reconnect
        status: 'inactive', // mark inactive until they re-connect
        collectedMaps: player.collectedMaps || []
      });
    });

    logWithTimestamp(`Loaded ${playersData.length} players from file`);
  } catch (err) {
    if (err.code !== 'ENOENT') { // Ignore if file doesn't exist
      logWithTimestamp('Error loading players:', err);
    }
  }
}

// Load game points from file on startup
async function loadGamePoints() {
  try {
    const data = await fs.readFile(GAMEPOINTS_FILE, 'utf8');
    serverGamePoints = JSON.parse(data);
    logWithTimestamp(`Loaded ${serverGamePoints.length} game points from file`);
  } catch (err) {
    if (err.code !== 'ENOENT') { // Ignore if file doesn't exist
      logWithTimestamp('Error loading game points:', err);
    }
  }
}

// Load game points from file on startup
async function loadAdventures() {
  try {
    const data = await fs.readFile(ADVENTURES_FILE, 'utf8');
    adventures = JSON.parse(data);
    logWithTimestamp(`Loaded ${adventures.length} adventures from file`);
  } catch (err) {
    if (err.code !== 'ENOENT') { // Ignore if file doesn't exist
      logWithTimestamp('Error loading adventures:', err);
    }
  }
}

function broadcastToAll(message) {
    for (const player of players.values()) {
        if (player.status === 'active' && player.ws && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(message);
        }
    }
}

function broadcastToOthers(senderId, message) {
  for (const [playerId, player] of players.entries()) {
    if (playerId !== senderId &&
        player.status === 'active' &&
        player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(message);
    }
  }
}

function sendActiveAdventures(ws = null) {
  const adventureIds = adventures.map(adv => adv.id);
  const message = JSON.stringify({ type: 'activeAdventures', adventures: adventureIds });
  logWithTimestamp('sending message about active adventures:', message);
  if (ws) {
    ws.send(message);
  } else {
    broadcastToAll(message);
  }
}

function sendAdventureMaps(ws = null) {
  // Remove all treasure map points. We will re-add them later.
  serverGamePoints = serverGamePoints.filter(point => point.type !== 'treasureMap');

  const allUncollectedMaps = adventures.flatMap(adventure => adventure.maps
    .filter(m => m.collectedBy === null)
    .map(m => ({...m, adventureId: adventure.id, adventureType: adventure.type}))
  );

  allUncollectedMaps.forEach(uncollectedMap => {
    serverGamePoints.push({
      type: 'treasureMap',
      x: uncollectedMap.x,
      y: uncollectedMap.y,
      map: uncollectedMap.map,
      adventureId: uncollectedMap.adventureId,
      adventureType: uncollectedMap.adventureType
    });
  });
  debouncedGamePointsSave();

  const message = JSON.stringify({ type: 'updateGamePoints', gamePoints: serverGamePoints });
    broadcastToAll(message);

  if (ws) {
    ws.send(message);
  } else {
    broadcastToAll(message);
  }
}

function removePlayersTreasureMaps(adventureIds) {
  // Remove treasure maps related to the given adventures from all players' collectedMaps
  for (const player of players.values()) {
    if (player.collectedMaps && player.collectedMaps.length > 0) {
      player.collectedMaps = player.collectedMaps.filter(mapInfo => !adventureIds.includes(mapInfo.adventureId));
    }
  }
  debouncedSave();
  sendAdventureMaps();
}

// Load initial data
(async () => {
    await Promise.all([loadPlayers(), loadMapData(), loadGamePoints(), loadAdventures()]);
})();

wss.on('connection', async ws => {
  logWithTimestamp('Client connected');
  let id;

  ws.on('message', data => {
    // Anybody can send anything into an open web socket, so a broken message
    // must be dropped instead of taking the whole game down with it.
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      logWithTimestamp('Ignoring a message which is not valid JSON:', error.message);
      return;
    }
    if (message === null || typeof message !== 'object') {
      logWithTimestamp('Ignoring a message which is not a JSON object:', message);
      return;
    }
    logWithTimestamp(`Received message from player:`, message);

    // Get current players before adding the new one
    let allPlayers = Array.from(players.values())
      .filter(p => p.status === 'active') // only active players
      .map(p => ({ id: p.id, x: p.x, y: p.y, map: p.map, colour: p.colour }));
    let newPlayerMessage;
    if (message.type === 'resume') {
      let playerState;
      if (message.id) {
        id = message.id;
        const existingPlayer = players.get(id);
        if (existingPlayer) {
          playerState = existingPlayer;
          if (!playerState.hasOwnProperty('name')) {
            playerState.name = getRandomName();
          }
          if (!playerState.hasOwnProperty('money')) {
            playerState.money = 0;
          }
          if (!playerState.hasOwnProperty('colour')) {
            playerState.colour = 'white';
          }
          if (!playerState.hasOwnProperty('map')) {
            playerState.map = 'base';
          }
          if (!playerState.hasOwnProperty('collectedMaps')) {
            playerState.collectedMaps = [];
          }
          playerState.ws = ws;
          playerState.status = 'active';
          playerState.lastAction = dateNow();
          debouncedSave();
        } else {
          logWithTimestamp(`Could not find record for player with ${id}`);
          playerState = {
            id,
            ws,
            x: 5,
            y: 5,
            map: 'base',
            name: getRandomName(),
            money: 0,
            colour: 'white',
            status: 'active',
            lastAction: dateNow()
          };
          players.set(id, playerState);
          debouncedSave();
        }
      }
      // Send initialization data to the new client
      ws.send(JSON.stringify({
        type: 'init',
        id,
        x: playerState.x,
        y: playerState.y,
        map: playerState.map,
        name: playerState.name,
        money: playerState.money,
        colour: playerState.colour,
        players: allPlayers,
        gamePoints: serverGamePoints,
        lastAction: dateNow()
      }));

      // Send collected map images
      if (playerState.collectedMaps && playerState.collectedMaps.length > 0) {
        playerState.collectedMaps.forEach(mapInfo => {
          const mapData = maps[mapInfo.map];
          if (mapData) {
            const adventure = adventures.find(adv => adv.id === mapInfo.adventureId);
            if (adventure) {
              generateMapImage(mapData.tiles, adventure.x, adventure.y)
                .then(imageData => {
                  const mapImageMessage = JSON.stringify({
                    type: 'treasureMapCollected',
                    map: mapInfo,
                    imageData: imageData
                  });
                  ws.send(mapImageMessage);
                })
                .catch(err => {
                  logWithTimestamp('Error re-generating map image for returning player:', err);
                });
            }
          }
        });
      }
      sendActiveAdventures(ws);

      newPlayerMessage = JSON.stringify({ type: 'newPlayer', player: { id, x: playerState.x, y: playerState.y, map: playerState.map, colour: playerState.colour } });

    } else if (message.type === 'create') {
      id = randomUUID();
      const x = 3;
      const y = 3; // TODO: calculate empty position!
      // Add the new player to the server state
      const playerState = { id, ws, x, y, map: 'base', name: getRandomName(), money: 0, colour: 'white', status: 'active', lastAction: dateNow(), collectedMaps: [] };
      players.set(id, playerState);
      // Send initialization data to the new client
      ws.send(JSON.stringify({
        type: 'init',
        id,
        x,
        y,
        map: playerState.map,
        name: playerState.name,
        money: playerState.money,
        colour: playerState.colour,
        players: allPlayers,
        gamePoints: serverGamePoints
      }));
      debouncedSave();
      logWithTimestamp(`New player ${id} connected at (${x}, ${y})`);
      newPlayerMessage = JSON.stringify({ type: 'newPlayer', player: { id, x: playerState.x, y: playerState.y, map: playerState.map, colour: playerState.colour } });

    } else if (message.type === 'move') {
      const player = players.get(id);
      if (player) {
        player.x = message.x;
        player.y = message.y;
        player.map = message.map;
        player.status = 'active';
        player.lastAction = dateNow();

        // Check if player stepped on a treasure map
        if (adventures.length > 0) {
          const adventure = adventures[0]; // Note: for now we have only one adventure at a time
          const mapIndex = adventure.maps.findIndex(m => m.map === player.map && m.x === player.x && m.y === player.y && m.collectedBy === null);

          if (mapIndex !== -1) {
            //const collectedMap = adventure.maps.splice(mapIndex, 1)[0];
            let collectedMap = adventure.maps[mapIndex];
            collectedMap.adventureId = adventure.id;
            adventure.maps[mapIndex].collectedBy = id;
            if (!player.collectedMaps) {
              player.collectedMaps = [];
            }
            player.collectedMaps.push(collectedMap);
            logWithTimestamp(`Player ${id} collected a treasure map at ${collectedMap.map} (${collectedMap.x}, ${collectedMap.y})`);

            // Generate and send the map image
            const mapData = maps[adventure.map];
            if (mapData) {
              //const mapHeight = mapData.tiles.length;
              //const drawingY = mapHeight - 1 - collectedMap.y;
              generateMapImage(mapData.tiles, adventure.x, adventure.y)
                .then(imageData => {
                  const mapImageMessage = JSON.stringify({
                    type: 'treasureMapCollected',
                    map: collectedMap,
                    imageData: imageData
                  });
                  ws.send(mapImageMessage);
                })
                .catch(err => {
                  logWithTimestamp('Error generating map image:', err);
                });
            }

            debouncedAdventuresSave();
            // Notify all clients about the updated adventure
            sendAdventureMaps();
            sendActiveAdventures();
            //const notCollectedMaps = adventure.maps.filter(m => m.collectedBy === null);
            //const adventureUpdateMessage = JSON.stringify({ type: 'newAdventure', adventure: { type: adventure.type, maps: notCollectedMaps } });
            //broadcastToAll(adventureUpdateMessage);
          }
        }

        debouncedSave();

        // Broadcast the move to all other clients
        const moveMessage = JSON.stringify({ type: 'playerMoved', id, x: message.x, y: message.y, map: message.map, colour: player.colour });
        broadcastToOthers(id, moveMessage);
      }
    } else if (message.type === 'ping') {
      const player = players.get(id);
      if (player) {
        player.status = 'active';
        player.lastAction = dateNow();
        debouncedSave();
      }
    } else if (message.type === 'settings') {
      const player = players.get(id);
      if (player) {
        player.name = message.name;
        player.colour = message.colour;
        player.lastAction = dateNow();
        debouncedSave();

        // Broadcast the settings change to all other clients
        const updateMessage = JSON.stringify({ type: 'playerUpdated', id, name: message.name, colour: message.colour });
        broadcastToOthers(id, updateMessage);
      }
    } else if (message.type === 'mapTransfer') {
      // TODO: Thiw should not be required, as map is sent in 'move' message
      const player = players.get(id);
      if (player) {
        player.map = message.map;
        debouncedSave();
      }
    } else if (message.type === 'coinCollected') {
      const player = players.get(id);
      if (player) {
        const coinIndex = serverGamePoints.findIndex(p => p.type === 'coin' && p.x === message.x && p.y === message.y && p.map === player.map);

        if (coinIndex !== -1) {
          // 1. Remove coin from the array
          serverGamePoints.splice(coinIndex, 1);
          debouncedGamePointsSave();

          // 2. Register +1 money for the player
          player.money += 1;
          player.lastAction = dateNow();
          debouncedSave();

          // 3. Send updated positions of coins to all players
          const coinsUpdateMessage = JSON.stringify({ type: 'updateGamePoints', gamePoints: serverGamePoints });
          broadcastToAll(coinsUpdateMessage);

          // 4. Send a message to the user with increased total amount of his money
          const moneyUpdateMessage = JSON.stringify({ type: 'updateMoney', money: player.money });
          ws.send(moneyUpdateMessage);
        } else {
          // Coin doesn't exist, maybe another player collected it.
          // Send current coin state to the player.
          const coinsUpdateMessage = JSON.stringify({ type: 'updateGamePoints', gamePoints: serverGamePoints });
          ws.send(coinsUpdateMessage);
        }
      }
    } else if (message.type === 'digging') {
      const player = players.get(id);
      if (player && player.money >= 0) { // server should validate money again
        player.money--; // This was already done on client, but we do it here for consistency
        const adventure = adventures.find(a => a.map === player.map && a.x === player.x && a.y === player.y);
        if (adventure) {
          logWithTimestamp(`Player ${id} has found a treasure!`);
          const award = 100;
          player.money += award;
          adventures = adventures.filter(a => a !== adventure);
          debouncedAdventuresSave();
          ws.send(JSON.stringify({ type: 'treasureFound', award, adventureId: adventure.id }));
          ws.send(JSON.stringify({ type: 'updateMoney', money: player.money }));
          // Let the other players see the coins flying, so that they notice
          // treasures are there to be found.
          broadcastToOthers(id, JSON.stringify({
            type: 'treasureDug',
            map: adventure.map,
            x: adventure.x,
            y: adventure.y,
            name: player.name
          }));
          removePlayersTreasureMaps([adventure.id]);
        }
      debouncedSave();
      }
    }

    if (message.type === 'resume' || message.type === 'create') {
      // if old player has connected again or a new player has connected, inform other players

      // Get current players before adding the new one
      allPlayers = Array.from(players.values())
        .filter(p => p.status === 'active') // only active players
        .map(p => ({ id: p.id, x: p.x, y: p.y }));

      // Notify all other players about the new player
      broadcastToOthers(id, newPlayerMessage);

      if (adventures.length > 0) {
        const adventure = adventures[0];
        sendAdventureMaps(ws);
        //const notCollectedMaps = adventure.maps.filter(m => m.collectedBy === null);
        //const message = JSON.stringify({ type: 'newAdventure', adventure: { type: adventure.type, maps: notCollectedMaps } });
        //ws.send(message);
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

function spawnCoin() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const isTime = (currentHour > coinStartTime.hour || (currentHour === coinStartTime.hour && currentMinute >= coinStartTime.minute)) &&
                   (currentHour < coinEndTime.hour || (currentHour === coinEndTime.hour && currentMinute <= coinEndTime.minute));

    if (!isTime) {
        return;
    }

    const coins = serverGamePoints.filter(p => p.type === 'coin');
    if (coins.length >= maxCoins) {
        return;
    }

    if (Math.random() > coinAppearanceProbability) {
        return;
    }

    // TODO: replace this with new findTile function
    const grassTiles = [];
    for (const [mapName, map] of Object.entries(maps)) {
      if (map.type === 'public') {
        const mapTiles = map.tiles;
        for (let y = 0; y < mapTiles.length; y++) {
          for (let x = 0; x < mapTiles[y].length; x++) {
            if (mapTiles[y][x] === 'Ž') {
                // TODO: we should also check if there is no existing coin in that place
                grassTiles.push({ x, y, mapName, tileLength: mapTiles.length });
            }
          }
        }
      }
    }

    if (grassTiles.length === 0) {
        logWithTimestamp(`No grass tiles found on all maps to spawn a coin.`);
        return;
    }

    const randomTile = grassTiles[Math.floor(Math.random() * grassTiles.length)];

    const newCoin = { type: 'coin', x: randomTile.x, y: randomTile.y, map: randomTile.mapName };
    serverGamePoints.push(newCoin);
    debouncedGamePointsSave();
    logWithTimestamp(`New coin spawned at (${newCoin.map}, ${newCoin.x}, ${newCoin.y})`);

    const message = JSON.stringify({ type: 'updateGamePoints', gamePoints: serverGamePoints });
    broadcastToAll(message);
}

// A player who has not connected for adventureAbandonInterval is considered to be
// gone from the game, so everything he is carrying is lost for the other players.
function isPlayerGone(playerId) {
  const player = players.get(playerId);
  if (!player) {
    // We do not know this player at all, so whatever he took is lost for good.
    return true;
  }
  if (player.status === 'active') {
    return false;
  }
  const lastAction = parseDate(player.lastAction);
  if (!lastAction) {
    // No usable last action time, so we can not say he is still playing.
    return true;
  }
  return Date.now() - lastAction.getTime() >= adventureAbandonInterval;
}

// A treasure map is lost when it is not laying on the ground any more (only maps
// with collectedBy === null are shown to the players) and the player who picked
// it up is gone.
function isTreasureMapLost(mapInfo) {
  if (mapInfo.collectedBy === null) {
    return false;
  }
  return isPlayerGone(mapInfo.collectedBy);
}

// An adventure is forgotten when none of the players can reach its treasure any
// more, that is when every one of its maps is lost.
function isAdventureForgotten(adventure) {
  const adventureMaps = adventure.maps || [];
  if (adventureMaps.length === 0) {
    // No maps were placed, so nobody will ever find this treasure.
    return true;
  }
  return adventureMaps.every(isTreasureMapLost);
}

// Removes adventures nobody can find any more, freeing the place for new ones.
function removeForgottenAdventures() {
  const forgotten = adventures.filter(isAdventureForgotten);
  if (forgotten.length === 0) {
    return;
  }

  forgotten.forEach(adventure => {
    logWithTimestamp(`Removing forgotten adventure: ${adventure.id} ${adventure.type} created ${adventure.createDate} at ${adventure.map} (${adventure.x}, ${adventure.y})`);
  });

  adventures = adventures.filter(adventure => !forgotten.includes(adventure));
  debouncedAdventuresSave();

  // Drop the maps of the removed adventures from the players and let everybody
  // know which adventures are still alive, so old maps are cleaned up.
  removePlayersTreasureMaps(forgotten.map(adventure => adventure.id));
  sendActiveAdventures();
}

// Periodical treasure logic check: first get rid of the adventures nobody can
// finish any more, then spawn a new one if there is room for it.
async function checkAdventures() {
  removeForgottenAdventures();
  await spawnAdventure();
}

async function spawnAdventure() {
  if (adventures.length > 0) {
    return;
  }

  const newAdventure = {
    id: shortUUID(),
    type: 'treasure1',
    createDate: dateNow()
  };

  const treasureLocation = findTile(['Ž', 'R']);
  if (!treasureLocation) {
      logWithTimestamp('Could not find a suitable tile to spawn an adventure.');
      return;
  }
  newAdventure.x = treasureLocation.x;
  newAdventure.y = treasureLocation.y;
  newAdventure.map = treasureLocation.mapName;

  logWithTimestamp(`Spawning adventure: ${newAdventure.id} ${newAdventure.type} at ${newAdventure.map} (${newAdventure.x}, ${newAdventure.y})`);

  newAdventure.maps = [];
  for (let i = 0; i < 1; i++) {
    const mapLocation = findTile(['Ž', 'R']);
    if (!mapLocation) {
        logWithTimestamp('Could not find a suitable tile to place the adventure map item.');
        continue;
    }
    newAdventure.maps.push({ id: i, map: mapLocation.mapName, x: mapLocation.x, y: mapLocation.y, collectedBy: null });
    logWithTimestamp(`   > Placing map item at ${mapLocation.mapName} (${mapLocation.x}, ${mapLocation.y})`);
  }

  adventures.push(newAdventure);
  debouncedAdventuresSave();
  sendAdventureMaps();
}

const coinInterval = setInterval(spawnCoin, coinAppearanceInterval);
const adventureInterval = setInterval(checkAdventures, adventureAppearanceInterval);

async function gracefulShutdown() {
  logWithTimestamp('Shutting down gracefully...');

  // 1. Stop new connections and close existing ones
  wss.close();

  // 2. Clear intervals
  clearInterval(coinInterval);
  clearInterval(adventureInterval);

  // 3. Save all data
  try {
    await Promise.all([
      savePlayers(),
      saveGamePoints(),
      saveAdventures()
    ]);
    logWithTimestamp('All data saved.');
  } catch (err) {
    logWithTimestamp('Error saving data during shutdown:', err);
  }

  // 4. Exit the process
  process.exit(0);
}

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

