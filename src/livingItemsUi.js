import { itemPlacementRefusal, livingItemName, livingItemPrice, livingItemTypes, canTurnItem } from '../shared/livingItems.js';
import { currentEntryTile, currentMapName, drawLivingItems, leaveLiving, livingItemsGroup, maps } from './components/Map.js';
import { LivingItemGhost } from './components/LivingItem.js';
import { playerData } from './components/Player.js';
import { currentItems, insideLivingId, itemAtPlace } from './livingItems.js';
import { initializePathfinding } from './utilies/findPath.js';
import { listenToPresses } from './utilies/listenToPresses.js';
import { sendMessage, sendPosition } from './websocket.js';

// The thing the player is putting down right now: what it is, where it stands
// at this moment and whether it is new or one which already stood in the room.
// Null while nothing is being put down.
let placing = null;
// The see-through copy of that thing, drawn where it would stand.
let ghost = null;

let itemListDialog = null;
let itemListLines = null;
let itemListChoices = null;
let itemDialog = null;
let itemTitle = null;
let itemLines = null;
let placementBar = null;
let placementHint = null;
let placeButton = null;
let turnButton = null;
// The thing the open item dialog is talking about.
let shownItem = null;

function buildDialogs() {
  if (itemListDialog) {
    return;
  }
  const container = document.getElementById('living-container');
  ['item-list-template', 'item-template', 'placement-template'].forEach(name => {
    container.appendChild(document.getElementById(name).content.cloneNode(true));
  });

  itemListDialog = document.getElementById('item-list-dialog');
  itemListLines = document.getElementById('item-list-lines');
  itemListChoices = document.getElementById('item-list-choices');
  itemDialog = document.getElementById('item-dialog');
  itemTitle = document.getElementById('item-title');
  itemLines = document.getElementById('item-lines');
  placementBar = document.getElementById('placement-bar');
  placementHint = document.getElementById('placement-hint');
  placeButton = document.getElementById('place-item');
  turnButton = document.getElementById('turn-item');

  listenToPresses(document.getElementById('close-item-list'), closeItemList);
  listenToPresses(document.getElementById('close-item'), closeItemDialog);
  listenToPresses(document.getElementById('move-item'), moveShownItem);
  listenToPresses(placeButton, placeGhost);
  listenToPresses(turnButton, turnGhost);
  listenToPresses(document.getElementById('cancel-placement'), stopPlacing);
}

// The buttons of a home: what to put into it and the way out. They are only
// there while the player is walking in a home of his own.
export function updateLivingToolbar() {
  const inside = Boolean(insideLivingId());
  document.getElementById('add-item-button').style.display = inside ? 'block' : 'none';
  document.getElementById('leave-living-button').style.display = inside ? 'block' : 'none';
  if (!inside) {
    closeItemList();
    closeItemDialog();
    stopPlacing();
  }
}

// The server has told us where the furniture of the player stands now, so the
// room is drawn anew and the path finder is told that the way through it has
// changed.
export function livingItemsChanged() {
  drawLivingItems();
  initializePathfinding();
  updateLivingToolbar();
  closeItemDialog();
  // Drawing the room anew takes away the thing the player is holding, so it
  // is put back into his hands.
  if (placing) {
    if (placing.mode === 'move') {
      hideItemMesh(placing.id);
    }
    showGhost();
  }
}

// Something the server did not allow, said in words the player can read.
export function showLivingItemMessage(text) {
  buildDialogs();
  stopPlacing();
  closeItemDialog();
  itemListLines.textContent = text;
  itemListChoices.textContent = '';
  itemListDialog.style.display = 'block';
}

// ---------------------------------------------------------------- the choice

function showItemList() {
  buildDialogs();
  closeItemDialog();
  itemListLines.textContent = `Tavo pinigai: €${playerData.money}`;
  itemListChoices.textContent = '';

  Object.keys(livingItemTypes).forEach(type => {
    const price = livingItemPrice(type);
    const button = document.createElement('button');
    const name = document.createElement('span');
    const cost = document.createElement('span');
    name.textContent = livingItemName(type);
    cost.textContent = `€${price}`;
    button.appendChild(name);
    button.appendChild(cost);
    button.disabled = playerData.money < price;
    listenToPresses(button, () => startAdding(type));
    itemListChoices.appendChild(button);
  });

  itemListDialog.style.display = 'block';
}

function closeItemList() {
  if (itemListDialog) {
    itemListDialog.style.display = 'none';
  }
}

// ------------------------------------------------- a thing already standing

// Tells the player what he has tapped on and lets him take it somewhere else.
function showItemDialog(item) {
  buildDialogs();
  closeItemList();
  shownItem = item;
  itemTitle.textContent = livingItemName(item.type);
  itemLines.textContent = 'Gali perkelti kitur.';
  itemDialog.style.display = 'block';
}

function closeItemDialog() {
  shownItem = null;
  if (itemDialog) {
    itemDialog.style.display = 'none';
  }
}

function moveShownItem() {
  const item = shownItem;
  closeItemDialog();
  if (item) {
    startMoving(item);
  }
}

// ------------------------------------------------------- putting things down

export function placementActive() {
  return Boolean(placing);
}

// Where a new thing is held out to the player: the closest place around him
// where it may really stand, so that he starts off looking at a green carpet
// and not at a red one. A bed which does not fit one way round is tried the
// other way round as well.
function itemToStartWith(type) {
  const reach = 5;
  for (let ring = 1; ring <= reach; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) {
          continue;
        }
        for (const turned of [false, true]) {
          const item = { type, x: playerData.x + dx, y: playerData.y + dy, turned };
          if (!refusalFor(item)) {
            return item;
          }
          if (!canTurnItem(type)) {
            break;
          }
        }
      }
    }
  }
  // Nowhere to put it. The player is shown the thing right next to him and
  // the bar tells him why it may not stand there.
  return { type, x: playerData.x + 1, y: playerData.y, turned: false };
}

function startAdding(type) {
  closeItemList();
  placing = {
    mode: 'add',
    living: insideLivingId(),
    item: itemToStartWith(type)
  };
  showGhost();
}

function startMoving(item) {
  placing = {
    mode: 'move',
    living: insideLivingId(),
    id: item.id,
    item: { ...item }
  };
  // While a thing is being carried it must not also be standing in its old
  // place, otherwise the player would see two of them at once.
  hideItemMesh(item.id);
  showGhost();
}

function hideItemMesh(itemId) {
  livingItemsGroup.children.forEach(mesh => {
    if (mesh.userData.item && mesh.userData.item.id === itemId) {
      mesh.visible = false;
    }
  });
}

// Why a thing may not stand where it is being held, or null when it may. The
// thing being carried is left out of the furniture it is looked at against,
// otherwise it would be standing in its own way.
function refusalFor(item, movedId = null) {
  return itemPlacementRefusal(
    maps[currentMapName],
    currentItems().filter(other => other.id !== movedId),
    item,
    { x: playerData.x, y: playerData.y },
    currentEntryTile()
  );
}

function placementRefusal() {
  return refusalFor(placing.item, placing.id);
}

function showGhost() {
  buildDialogs();
  removeGhost();
  if (!placing) {
    return;
  }
  const refusal = placementRefusal();
  ghost = LivingItemGhost(placing.item, !refusal);
  livingItemsGroup.add(ghost);

  placementHint.textContent = refusal || 'Paspausk, kur padėti.';
  placeButton.disabled = Boolean(refusal);
  turnButton.style.display = canTurnItem(placing.item.type) ? 'block' : 'none';
  placementBar.style.display = 'block';
}

function removeGhost() {
  if (ghost) {
    livingItemsGroup.remove(ghost);
    ghost = null;
  }
}

export function stopPlacing() {
  const wasMoving = placing && placing.mode === 'move';
  placing = null;
  removeGhost();
  if (placementBar) {
    placementBar.style.display = 'none';
  }
  if (wasMoving) {
    // The thing goes back to where it stood before it was picked up.
    drawLivingItems();
  }
}

// The player has tapped a tile while holding a thing: that is where he wants
// it to stand.
function moveGhostTo(x, y) {
  placing.item.x = x;
  placing.item.y = y;
  showGhost();
}

function turnGhost() {
  placing.item.turned = !placing.item.turned;
  showGhost();
}

function placeGhost() {
  if (!placing || placementRefusal()) {
    return;
  }
  const { mode, living, id, item } = placing;
  placing = null;
  removeGhost();
  placementBar.style.display = 'none';

  if (mode === 'add') {
    sendMessage({ type: 'addLivingItem', living, itemType: item.type, x: item.x, y: item.y, turned: item.turned });
    // Old servers which know nothing about furniture would leave the thing
    // hanging in the air, so nothing is drawn until the server has spoken.
  } else {
    sendMessage({ type: 'moveLivingItem', living, id, x: item.x, y: item.y, turned: item.turned });
  }
}

// A tap on the room itself. Gives back whether it was about the furniture, so
// that the player is not sent walking as well.
export function tapInLiving(x, y) {
  if (placing) {
    moveGhostTo(x, y);
    return true;
  }
  if (!insideLivingId()) {
    return false;
  }
  const item = itemAtPlace(x, y);
  if (item) {
    showItemDialog(item);
    return true;
  }
  return false;
}

// ------------------------------------------------------------- the toolbar

window.addEventListener('DOMContentLoaded', () => {
  listenToPresses(document.getElementById('add-item-button'), () => {
    if (insideLivingId()) {
      stopPlacing();
      showItemList();
    }
  });
  listenToPresses(document.getElementById('leave-living-button'), () => {
    if (!insideLivingId()) {
      return;
    }
    stopPlacing();
    closeItemList();
    closeItemDialog();
    if (leaveLiving(initializePathfinding)) {
      sendPosition(playerData.x, playerData.y);
    }
    updateLivingToolbar();
  });
});
