import * as THREE from "three";
import { tileSize } from "../constants.js";
import { itemSize, livingItemType } from "../../shared/livingItems.js";
import { Chair } from "./Chair.js";
import { Bed } from "./Bed.js";

// The shape of a piece of furniture, built around the middle of the tiles it
// takes up. Everything which is not square is drawn laying along the x axis,
// and a turned thing is simply turned a quarter of the way round.
function shapeOf(type) {
  if (type === 'bed') {
    return Bed();
  }
  return Chair(0, 0);
}

export function LivingItem(item) {
  const shape = shapeOf(item.type);
  const size = itemSize(item);
  // The place of an item is its lower left tile, so a thing two tiles wide
  // stands half a tile further than the tile it is written down at.
  shape.position.x = (item.x + (size.width - 1) / 2) * tileSize;
  shape.position.y = (item.y + (size.height - 1) / 2) * tileSize;
  shape.rotation.z = item.turned ? Math.PI / 2 : 0;
  shape.userData.item = item;
  return shape;
}

// The same piece of furniture while the player is still choosing where to put
// it: see-through, and standing on a carpet which is green as long as it may
// stand there and red as soon as it may not.
export function LivingItemGhost(item, allowed) {
  const ghost = LivingItem(item);
  ghost.traverse(object => {
    if (!object.isMesh) {
      return;
    }
    object.castShadow = false;
    object.receiveShadow = false;
    object.material = object.material.clone();
    object.material.transparent = true;
    object.material.opacity = 0.6;
    object.material.depthWrite = false;
  });

  // The carpet is put inside the group, before it is turned, so it is drawn
  // the same way round as the thing standing on it.
  const kind = livingItemType(item.type);
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(kind.width * tileSize - 4, kind.height * tileSize - 4),
    new THREE.MeshBasicMaterial({
      color: allowed ? 0x2ec27e : 0xe01b24,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    })
  );
  carpet.position.z = 3.5;
  ghost.add(carpet);

  return ghost;
}
