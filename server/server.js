import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'fs';
import { parseMapData } from '../shared/mapParser.js';
import { generateMapImage } from './mapGenerator.js';
import { tearImage } from './tearMap.js';
import { coinStartTime, coinEndTime, maxCoins, coinAppearanceProbability, coinAppearanceInterval, adventureAppearanceInterval, adventureAbandonInterval } from '../src/constants.js';
import { findTile } from '../src/utilies/findTile.js';
import { tileAt, toIndex } from '../shared/mapCoords.js';
import { livingKey, livingPrice, livingTypeName } from '../shared/livingSpace.js';
import { initialiseMapData } from '../src/components/Map.js';

const wss = new WebSocketServer({ port: 8088 });
const PLAYERS_FILE = './players.json';
const GAMEPOINTS_FILE = './gamePoints.json';
const ADVENTURES_FILE = './adventures.json';
const LIVING_FILE = './livingSpaces.json';

const players = new Map();
let maps = {};
let serverGamePoints = []; // all game points (comming not from a map) - coins, treasure maps.
let adventures = [];
// Living spaces which players have already bought. The map file only says
// where the living spaces are, who lives in them is remembered here.
let livingSpaces = [];
// Torn map pieces of an adventure, kept so the same map is not drawn and torn
// again for every single piece a player has. Keyed by adventure id.
const adventureMapPieces = new Map();

// The kinds of adventure that can appear. The number in the name says into how
// many pieces the treasure map is torn.
const adventureTypes = ['treasure1', 'treasure2', 'treasure4'];

// Where a coin may lay, and where a treasure or a piece of a treasure map may
// be hidden. The same kinds of tile are used when something new is put onto a
// map and when the things already remembered are looked over, see
// validateStoredPlaces.
const coinTiles = ['Ž'];
const treasureTiles = ['Ž', 'R'];
// Tiles a player can not stand on. The browser forbids walking onto them in
// endsUpInValidPosition, these are the very same ones.
const unwalkableTiles = ['M', 'P', 'V'];

function pieceCount(adventure) {
  const count = Number(String(adventure.type).replace('treasure', ''));
  return Number.isFinite(count) && count > 0 ? count : 1;
}

// Draws the treasure map of an adventure and tears it into its pieces. The same
// seed - the adventure id - always gives the very same pieces back.
async function getAdventureMapPieces(adventure) {
  const cached = adventureMapPieces.get(adventure.id);
  if (cached) {
    return cached;
  }
  const mapData = maps[adventure.map];
  if (!mapData) {
    logWithTimestamp(`Cannot draw a treasure map, map '${adventure.map}' is not known.`);
    return null;
  }
  // The picture is drawn out of the tile array, so the place of the treasure
  // has to be turned from the world into that array first.
  const treasure = toIndex(mapData, adventure.x, adventure.y);
  const whole = await generateMapImage(mapData.tiles, treasure.x, treasure.y);
  const pieces = await tearImage(whole, pieceCount(adventure), adventure.id);
  adventureMapPieces.set(adventure.id, pieces);
  return pieces;
}

// Sends one piece of an adventure treasure map to one player.
async function sendMapPiece(ws, adventure, mapInfo) {
  try {
    const torn = await getAdventureMapPieces(adventure);
    const piece = torn && torn.pieces[mapInfo.id];
    if (!piece) {
      return;
    }
    ws.send(JSON.stringify({
      type: 'treasureMapCollected',
      map: mapInfo,
      imageData: piece.image,
      // Where this scrap sat on the whole map, so several of them can be laid
      // back together by the player who found them.
      piece: {
        x: piece.x,
        y: piece.y,
        width: piece.width,
        height: piece.height,
        sheetWidth: torn.sheetWidth,
        sheetHeight: torn.sheetHeight
      }
    }));
  } catch (error) {
    logWithTimestamp('Error drawing a treasure map piece:', error);
  }
}

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

// Save all bought living spaces to file
async function saveLivingSpaces() {
  await fs.writeFile(LIVING_FILE, JSON.stringify(livingSpaces, null, 2));
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

let saveLivingDebounce;
function debouncedLivingSave() {
  clearTimeout(saveLivingDebounce);
  saveLivingDebounce = setTimeout(saveLivingSpaces, 10000);
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

// Load bought living spaces from file on startup
async function loadLivingSpaces() {
  try {
    const data = await fs.readFile(LIVING_FILE, 'utf8');
    const loaded = JSON.parse(data);
    livingSpaces = Array.isArray(loaded) ? loaded.filter(space => space && space.owner) : [];
    logWithTimestamp(`Loaded ${livingSpaces.length} living spaces from file`);
  } catch (err) {
    if (err.code !== 'ENOENT') { // Ignore if file doesn't exist
      logWithTimestamp('Error loading living spaces:', err);
    }
  }
}

// The living point of a map, that is the place where a living space can be
// bought. The map file is the only one who knows where those places are.
function livingPointAt(mapName, x, y) {
  const map = maps[mapName];
  if (!map || !map.points) {
    return null;
  }
  return map.points.find(point => point.type === 'living' && point.x === x && point.y === y) || null;
}

// The living point with this id, wherever it is drawn. This is how a bought
// living space finds its house again: the place may change, the id does not.
function livingPointById(id) {
  if (!id) {
    return null;
  }
  for (const [mapName, map] of Object.entries(maps)) {
    const point = (map.points || []).find(p => p.type === 'living' && p.id === id);
    if (point) {
      return { point, mapName };
    }
  }
  return null;
}

// The house a bought living space belongs to, together with the map it is on.
// A space bought before the map file had ids - and never matched to a point
// since - is still found by its place.
function livingPointOf(space) {
  const byId = livingPointById(space.id);
  if (byId) {
    return byId;
  }
  const point = livingPointAt(space.map, space.x, space.y);
  return point ? { point, mapName: space.map } : null;
}

// Is this house already bought? Asked with the point of the map, so the id is
// what decides.
function boughtLivingSpaceOf(mapName, point) {
  if (!point) {
    return null;
  }
  const key = livingKey(mapName, point);
  return livingSpaces.find(space => livingKey(space.map, space) === key) || null;
}

// The living spaces as the players see them: the name of the owner is looked
// up every time, because a player can rename himself at any moment, and so is
// the place of the house, which the map file may have moved.
function livingSpacesForPlayers() {
  return livingSpaces.map(space => {
    const owner = players.get(space.owner);
    const home = livingPointOf(space);
    return {
      id: space.id,
      map: home ? home.mapName : space.map,
      x: home ? home.point.x : space.x,
      y: home ? home.point.y : space.y,
      owner: space.owner,
      ownerName: owner ? owner.name : 'Nežinomas'
    };
  });
}

function sendLivingSpaces(ws = null) {
  const message = JSON.stringify({ type: 'livingSpaces', spaces: livingSpacesForPlayers() });
  if (ws) {
    ws.send(message);
  } else {
    broadcastToAll(message);
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

// Is this place on this map a tile of one of the given kinds? A place outside
// the map, or on a map which is not there any more, is not.
function placeIsOneOf(mapName, x, y, allowed) {
  const tile = tileAt(maps[mapName], x, y);
  return tile !== undefined && allowed.includes(tile);
}

function placeIsWalkable(mapName, x, y) {
  const tile = tileAt(maps[mapName], x, y);
  return tile !== undefined && !unwalkableTiles.includes(tile);
}

// The closest place to the given one a player can stand on - the place itself
// when it is free. Used to get a player out of a wall he never walked into and
// to find a corner for a player who has just joined the game.
function nearestWalkablePlace(mapName, x, y) {
  const map = maps[mapName];
  if (!map || !map.tiles.length) {
    return null;
  }
  const furthest = map.tiles.length + map.tiles[0].length;
  for (let ring = 0; ring <= furthest; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        // Only the edge of the ring is new, everything inside it has already
        // been looked at.
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) {
          continue;
        }
        if (placeIsWalkable(mapName, x + dx, y + dy)) {
          return { x: x + dx, y: y + dy };
        }
      }
    }
  }
  return null;
}

// The maps are drawn by hand and they keep growing: a tile which was grass
// yesterday can be a house today, and a map can be extended in any direction.
// Anything remembered on such a tile would lay there forever, out of reach of
// the children - and a coin stuck inside a tree still takes up one of the very
// few places a coin may have. So everything the files remember is looked over
// once the maps have been read.
async function validateStoredPlaces() {
  // Coins are the cheapest thing in the game, a lost one simply appears
  // somewhere else a few minutes later.
  const lostCoins = serverGamePoints.filter(point =>
    point.type === 'coin' && !placeIsOneOf(point.map, point.x, point.y, coinTiles));
  lostCoins.forEach(coin => {
    logWithTimestamp(`Removing a coin which can not be reached any more at ${coin.map} (${coin.x}, ${coin.y})`);
  });
  if (lostCoins.length > 0) {
    serverGamePoints = serverGamePoints.filter(point => !lostCoins.includes(point));
  }

  // A treasure inside a house can never be dug out, so the whole adventure
  // goes - with all its pieces, which are of no use without the treasure.
  const lostAdventures = adventures.filter(adventure =>
    !placeIsOneOf(adventure.map, adventure.x, adventure.y, treasureTiles));
  lostAdventures.forEach(adventure => {
    logWithTimestamp(`Removing adventure ${adventure.id} ${adventure.type}: its treasure at ${adventure.map} (${adventure.x}, ${adventure.y}) can not be dug out any more`);
    adventureMapPieces.delete(adventure.id);
  });
  if (lostAdventures.length > 0) {
    adventures = adventures.filter(adventure => !lostAdventures.includes(adventure));
  }

  // A piece of a treasure map which nobody has picked up yet is only laying
  // around, so it is simply moved to another place instead of spoiling the
  // whole adventure for the children who already carry the other pieces.
  let piecesMoved = 0;
  adventures.forEach(adventure => {
    const taken = (adventure.maps || [])
      .map(piece => `${piece.map}:${piece.x},${piece.y}`)
      .concat(`${adventure.map}:${adventure.x},${adventure.y}`);
    (adventure.maps || []).forEach(piece => {
      if (piece.collectedBy !== null) {
        return;
      }
      if (placeIsOneOf(piece.map, piece.x, piece.y, treasureTiles)) {
        return;
      }
      let newPlace = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = findTile(treasureTiles);
        if (!candidate) {
          break;
        }
        if (!taken.includes(`${candidate.mapName}:${candidate.x},${candidate.y}`)) {
          newPlace = candidate;
          break;
        }
      }
      if (!newPlace) {
        logWithTimestamp(`Could not find a new place for map piece ${piece.id} of adventure ${adventure.id}, leaving it where it is`);
        return;
      }
      logWithTimestamp(`Moving map piece ${piece.id} of adventure ${adventure.id} from ${piece.map} (${piece.x}, ${piece.y}) to ${newPlace.mapName} (${newPlace.x}, ${newPlace.y})`);
      piece.map = newPlace.mapName;
      piece.x = newPlace.x;
      piece.y = newPlace.y;
      taken.push(`${newPlace.mapName}:${newPlace.x},${newPlace.y}`);
      piecesMoved++;
    });
  });

  // A player who was left standing in a wall could not take a single step any
  // more, so he is put onto the closest place he could have walked to.
  let playersMoved = 0;
  for (const player of players.values()) {
    if (placeIsWalkable(player.map, player.x, player.y)) {
      continue;
    }
    const mapName = maps[player.map] ? player.map : 'base';
    const place = nearestWalkablePlace(mapName, player.x, player.y);
    if (!place) {
      logWithTimestamp(`Player ${player.id} is standing at ${player.map} (${player.x}, ${player.y}), where nobody can stand, and no free place was found`);
      continue;
    }
    logWithTimestamp(`Moving player ${player.id} away from ${player.map} (${player.x}, ${player.y}), where nobody can stand any more, to ${mapName} (${place.x}, ${place.y})`);
    player.map = mapName;
    player.x = place.x;
    player.y = place.y;
    playersMoved++;
  }

  // Living points should all carry an id, that is what ownership hangs on.
  // One without an id still works - it is remembered by its place, the way it
  // used to be - but it is a map file waiting to lose somebody's home, so it
  // is said out loud once.
  for (const [mapName, map] of Object.entries(maps)) {
    const nameless = (map.points || []).filter(point => point.type === 'living' && !point.id);
    if (nameless.length > 0) {
      logWithTimestamp(`WARNING: map '${mapName}' has ${nameless.length} living point(s) without an id, they are remembered by their place only`);
    }
  }

  // A bought living space is never thrown away by the server - a child has
  // paid for it. One bought before the map file had ids is matched to its
  // point once, by the place it was bought at, and carries that id from then
  // on. A house which has been moved in the map file simply takes its owner
  // along.
  let livingChanged = false;
  livingSpaces.forEach(space => {
    if (!space.id) {
      const point = livingPointAt(space.map, space.x, space.y);
      if (point && point.id) {
        space.id = point.id;
        livingChanged = true;
        logWithTimestamp(`The living space bought by ${space.owner} at ${space.map} (${space.x}, ${space.y}) is from now on remembered as ${point.id}`);
      } else {
        logWithTimestamp(`WARNING: the living space bought by ${space.owner} at ${space.map} (${space.x}, ${space.y}) has no id and there is no living point in that place any more`);
      }
      return;
    }
    const home = livingPointById(space.id);
    if (!home) {
      logWithTimestamp(`WARNING: the living space ${space.id} bought by ${space.owner} is not in the map file any more`);
      return;
    }
    if (home.mapName !== space.map || home.point.x !== space.x || home.point.y !== space.y) {
      logWithTimestamp(`The living space ${space.id} bought by ${space.owner} has moved with its house from ${space.map} (${space.x}, ${space.y}) to ${home.mapName} (${home.point.x}, ${home.point.y})`);
      space.map = home.mapName;
      space.x = home.point.x;
      space.y = home.point.y;
      livingChanged = true;
    }
  });

  if (lostAdventures.length > 0 || piecesMoved > 0) {
    // Lets the players forget the maps of the adventures which are gone, and
    // draws the places where the pieces lay now.
    removePlayersTreasureMaps(lostAdventures.map(adventure => adventure.id));
    await saveAdventures();
  }
  if (lostCoins.length > 0 || lostAdventures.length > 0 || piecesMoved > 0) {
    await saveGamePoints();
  }
  if (playersMoved > 0) {
    await savePlayers();
  }
  if (livingChanged) {
    await saveLivingSpaces();
  }
}

// Load initial data
(async () => {
    await Promise.all([loadPlayers(), loadMapData(), loadGamePoints(), loadAdventures(), loadLivingSpaces()]);
    await validateStoredPlaces();
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
        livingSpaces: livingSpacesForPlayers(),
        lastAction: dateNow()
      }));

      // Send collected map images
      if (playerState.collectedMaps && playerState.collectedMaps.length > 0) {
        playerState.collectedMaps.forEach(mapInfo => {
          const adventure = adventures.find(adv => adv.id === mapInfo.adventureId);
          if (adventure) {
            sendMapPiece(ws, adventure, mapInfo);
          }
        });
      }
      sendActiveAdventures(ws);

      newPlayerMessage = JSON.stringify({ type: 'newPlayer', player: { id, x: playerState.x, y: playerState.y, map: playerState.map, colour: playerState.colour } });

    } else if (message.type === 'create') {
      id = randomUUID();
      // A new player starts in the corner of the base map, on the closest
      // place there he can really stand on - the corner itself may well be
      // water or a house.
      const start = nearestWalkablePlace('base', 3, 3) || { x: 3, y: 3 };
      const x = start.x;
      const y = start.y;
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
        gamePoints: serverGamePoints,
        livingSpaces: livingSpacesForPlayers()
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

            // Draw and send the piece of the map that was just picked up.
            sendMapPiece(ws, adventure, collectedMap);

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

        // The name of a home owner is shown to everybody, so a renamed owner
        // has to be told about.
        if (livingSpaces.some(space => space.owner === id)) {
          sendLivingSpaces();
        }
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
    } else if (message.type === 'buyLiving') {
      const player = players.get(id);
      if (player) {
        // The id tells which house the player means. An older browser sends
        // no id, so the place it clicked on is looked up instead.
        const home = livingPointById(message.id);
        const point = home ? home.point : livingPointAt(message.map, message.x, message.y);
        const mapName = home ? home.mapName : message.map;
        const taken = boughtLivingSpaceOf(mapName, point);
        const price = point ? livingPrice(point) : null;
        // The player has to stand next to the house he is buying, exactly like
        // he has to walk up to a transfer point to use it. Where the house
        // stands is read from the map, not from what the browser says.
        const isNear = Boolean(point) && player.map === mapName &&
          Math.abs(player.x - point.x) <= 1 &&
          Math.abs(player.y - point.y) <= 1;

        let refusal = null;
        if (!point) {
          refusal = 'Čia nėra gyvenamosios vietos.';
        } else if (taken) {
          refusal = 'Šią vietą jau nupirko kitas žaidėjas.';
        } else if (price === null) {
          refusal = 'Ši vieta neparduodama.';
        } else if (!isNear) {
          refusal = 'Reikia prieiti arčiau.';
        } else if (player.money < price) {
          refusal = `Trūksta pinigų, reikia €${price}.`;
        }

        if (refusal) {
          logWithTimestamp(`Player ${id} could not buy a living space at ${mapName} (${message.x}, ${message.y}): ${refusal}`);
          ws.send(JSON.stringify({ type: 'buyLivingFailed', reason: refusal }));
          // Whatever the player believed, let him see how things really are.
          ws.send(JSON.stringify({ type: 'updateMoney', money: player.money }));
          sendLivingSpaces(ws);
        } else {
          player.money -= price;
          player.lastAction = dateNow();
          // The id is what the house is remembered by; the map and the place
          // are only written down so that a person reading the file can see
          // where it was at the time.
          livingSpaces.push({
            id: point.id,
            map: mapName,
            x: point.x,
            y: point.y,
            type: point.livingType,
            price,
            owner: id,
            boughtDate: dateNow()
          });
          debouncedLivingSave();
          debouncedSave();
          logWithTimestamp(`Player ${id} bought ${livingTypeName(point.livingType)} ${point.id || '(without an id)'} at ${mapName} (${point.x}, ${point.y}) for €${price}`);

          ws.send(JSON.stringify({ type: 'updateMoney', money: player.money }));
          ws.send(JSON.stringify({
            type: 'livingBought',
            id: point.id,
            map: mapName,
            x: point.x,
            y: point.y,
            price
          }));
          // Everybody has to see the lightbulb of that house turn blue.
          sendLivingSpaces();
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
          adventureMapPieces.delete(adventure.id);
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

    // TODO: we should also check if there is no existing coin in that place
    const randomTile = findTile(coinTiles);
    if (!randomTile) {
        logWithTimestamp(`No grass tiles found on all maps to spawn a coin.`);
        return;
    }

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
  forgotten.forEach(adventure => adventureMapPieces.delete(adventure.id));
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
    type: adventureTypes[Math.floor(Math.random() * adventureTypes.length)],
    createDate: dateNow()
  };

  const treasureLocation = findTile(treasureTiles);
  if (!treasureLocation) {
      logWithTimestamp('Could not find a suitable tile to spawn an adventure.');
      return;
  }
  newAdventure.x = treasureLocation.x;
  newAdventure.y = treasureLocation.y;
  newAdventure.map = treasureLocation.mapName;

  const pieces = pieceCount(newAdventure);
  logWithTimestamp(`Spawning adventure: ${newAdventure.id} ${newAdventure.type} at ${newAdventure.map} (${newAdventure.x}, ${newAdventure.y}), map torn into ${pieces}`);

  // Every piece goes to its own tile, otherwise two pieces laying on one tile
  // would hide each other.
  const taken = [`${newAdventure.map}:${newAdventure.x},${newAdventure.y}`];
  newAdventure.maps = [];
  for (let i = 0; i < pieces; i++) {
    let mapLocation = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = findTile(treasureTiles);
      if (!candidate) {
        break;
      }
      if (!taken.includes(`${candidate.mapName}:${candidate.x},${candidate.y}`)) {
        mapLocation = candidate;
        break;
      }
    }
    if (!mapLocation) {
        logWithTimestamp('Could not find a free tile to place the adventure map piece.');
        continue;
    }
    taken.push(`${mapLocation.mapName}:${mapLocation.x},${mapLocation.y}`);
    newAdventure.maps.push({ id: i, map: mapLocation.mapName, x: mapLocation.x, y: mapLocation.y, collectedBy: null });
    logWithTimestamp(`   > Placing map piece ${i} at ${mapLocation.mapName} (${mapLocation.x}, ${mapLocation.y})`);
  }

  if (newAdventure.maps.length === 0) {
    logWithTimestamp('No map pieces could be placed, so no adventure was created.');
    return;
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
      saveAdventures(),
      saveLivingSpaces()
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

