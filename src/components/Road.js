import * as THREE from "three";
import { tileSize } from "../constants";
import { mapData } from "../components/Map";

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

    if ((mapData[y][x-1] === ' ') ||
        (mapData[y][x+1] === ' ')) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 2, 2),
        new THREE.MeshLambertMaterial({ color: 0xeeeeee })
      );
      dash.position.z = 1;
      road.add(dash);
    }

    return road;
}
