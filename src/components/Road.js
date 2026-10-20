import * as THREE from "three";
import { tileSize } from "../constants.js";
import { currentTileAt } from "../components/Map.js";

// x and y are the place of the road in the world. Which way the dash on it
// lays is told by the roads standing next to it.
export function Road(x, y) {
    const road = new THREE.Group();
    road.position.x = x * tileSize;
    road.position.y = y * tileSize;

    const foundation = new THREE.Mesh(
        new THREE.PlaneGeometry(tileSize, tileSize),
        new THREE.MeshLambertMaterial({ color: 0x454a59 })
    );
    foundation.receiveShadow = true;
    road.add(foundation);

    if ((currentTileAt(x - 1, y) === 'G') ||
        (currentTileAt(x + 1, y) === 'G')) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 2, 2),
        new THREE.MeshLambertMaterial({ color: 0xeeeeee })
      );
      dash.position.z = 0.5;
      road.add(dash);
    } else {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 10, 2),
        new THREE.MeshLambertMaterial({ color: 0xeeeeee })
      );
      dash.position.z = 0.5;
      road.add(dash);
    }

    return road;
}
