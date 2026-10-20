import { livingPrice, livingTypeName } from '../shared/livingSpace.js';
import { isMyLivingSpace, livingSpaceOwner } from './livingSpaces.js';
import { playerData } from './components/Player.js';
import { currentMapName, maps, switchToMap } from './components/Map.js';
import { initializePathfinding } from './utilies/findPath.js';
import { sendMessage } from './websocket.js';

// The living point the open dialog is talking about.
let shownPoint = null;
// Waits for the answer of the server to a buying request.
let buyTimer = null;

let dialog = null;
let titleEl = null;
let linesEl = null;
let enterButton = null;
let buyButton = null;

function buildDialog() {
  if (dialog) {
    return;
  }
  const container = document.getElementById('living-container');
  const template = document.getElementById('living-template');
  container.appendChild(template.content.cloneNode(true));

  dialog = document.getElementById('living-dialog');
  titleEl = document.getElementById('living-title');
  linesEl = document.getElementById('living-lines');
  enterButton = document.getElementById('enter-living');
  buyButton = document.getElementById('buy-living');

  listenToPresses(document.getElementById('close-living'), closeLivingDialog);
  listenToPresses(buyButton, buyShownLivingSpace);
  listenToPresses(enterButton, enterShownLivingSpace);
}

// A computer presses a button with a click, a phone with a touch. The touch is
// answered and stopped right there, because a touch which is left alone is
// turned into a click afterwards and the button would be pressed twice.
function listenToPresses(button, press) {
  const handlePress = event => {
    event.preventDefault();
    press();
  };
  button.addEventListener('click', handlePress);
  button.addEventListener('touchend', handlePress);
}

function setLines(lines) {
  linesEl.textContent = '';
  lines.forEach(text => {
    const line = document.createElement('div');
    line.textContent = text;
    linesEl.appendChild(line);
  });
}

export function closeLivingDialog() {
  shownPoint = null;
  clearTimeout(buyTimer);
  if (dialog) {
    dialog.style.display = 'none';
  }
}

// Tells the player what is going on in the house he has just clicked on: how
// much a free one costs, or who is living in a taken one.
export function showLivingDialog(point) {
  buildDialog();
  clearTimeout(buyTimer);
  shownPoint = point;

  const price = livingPrice(point);
  const space = livingSpaceOwner(currentMapName, point);
  const isMine = isMyLivingSpace(currentMapName, point);
  const canEnter = isMine && Boolean(point.map) && Boolean(maps[point.map]);

  titleEl.textContent = livingTypeName(point.livingType);
  enterButton.style.display = canEnter ? 'inline-block' : 'none';
  buyButton.style.display = 'none';

  if (isMine) {
    setLines(['🏡 Čia tavo namai.']);
  } else if (space) {
    // Somebody else lives here, so the door stays shut.
    setLines([`🔒 Čia gyvena ${space.ownerName}.`, 'Įeiti negalima.']);
  } else if (price === null) {
    setLines(['Ši vieta neparduodama.']);
  } else {
    const lines = [`Kaina: €${price}`, `Tavo pinigai: €${playerData.money}`];
    if (playerData.money >= price) {
      buyButton.style.display = 'inline-block';
    } else {
      lines.push(`Trūksta €${price - playerData.money}.`);
    }
    setLines(lines);
  }

  dialog.style.display = 'block';
}

// The bought houses have changed. If the open dialog is talking about one of
// them, it has to say the new truth, for example when another player was
// quicker to buy the very same place.
export function livingSpacesChanged() {
  if (shownPoint && dialog && dialog.style.display === 'block') {
    showLivingDialog(shownPoint);
  }
}

// Shows a message in the open dialog, for example when the server did not let
// the player buy a house after all.
export function showLivingMessage(text) {
  if (!dialog || dialog.style.display !== 'block') {
    return;
  }
  clearTimeout(buyTimer);
  shownPoint = null;
  buyButton.style.display = 'none';
  enterButton.style.display = 'none';
  setLines([text]);
}

function buyShownLivingSpace() {
  if (!shownPoint) {
    return;
  }
  const point = shownPoint;
  // Asked for once is enough, from here on the server is the one who counts the
  // money and hands out the house.
  shownPoint = null;
  // The id says which house is being bought, the place is sent along so the
  // server can see that the player is really standing next to it.
  sendMessage({ type: 'buyLiving', id: point.id, map: currentMapName, x: point.x, y: point.y });
  buyButton.style.display = 'none';
  enterButton.style.display = 'none';
  setLines(['Perkame...']);

  // A server which says nothing at all - an old one which does not know about
  // buying yet, or a broken connection - must not leave the player staring at
  // "Perkame..." for ever.
  clearTimeout(buyTimer);
  buyTimer = setTimeout(() => {
    showLivingMessage('Nepavyko nusipirkti. Pabandyk dar kartą.');
  }, 5000);
}

function enterShownLivingSpace() {
  if (!shownPoint || !shownPoint.map) {
    return;
  }
  const point = shownPoint;
  closeLivingDialog();
  switchToMap(point.map, initializePathfinding, point.map_x, point.map_y);
  sendMessage({ type: 'mapTransfer', map: point.map });
}

// The player has just bought a home, so let him enjoy it for a moment.
export function livingBought(message) {
  buildDialog();
  clearTimeout(buyTimer);
  shownPoint = null;
  titleEl.textContent = 'Sveikiname!';
  enterButton.style.display = 'none';
  buyButton.style.display = 'none';
  setLines(['🎉 Nupirkai gyvenamąją vietą', `už €${message.price}.`]);
  dialog.style.display = 'block';
}
