import * as THREE from "three";
import { tileSize } from "../constants.js";

// An indoor floor of ceramic tiles. Small plates are laid in a chequered
// pattern on top of a grout coloured foundation, which shows in the seams
// between them.
export function TileFloor(x, y) {
    const floor = new THREE.Group();
    floor.position.x = x * tileSize;
    floor.position.y = y * tileSize;

    const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(tileSize, tileSize, 3),
        new THREE.MeshLambertMaterial({ color: 0x8c8880 })
    );
    foundation.position.z = 1.5;
    foundation.receiveShadow = true;
    floor.add(foundation);

    const plateCount = 3;
    const plateSize = tileSize / plateCount;
    for (let row = 0; row < plateCount; row++) {
        for (let col = 0; col < plateCount; col++) {
            const plate = new THREE.Mesh(
                new THREE.PlaneGeometry(plateSize - 0.8, plateSize - 0.8),
                new THREE.MeshLambertMaterial({
                    color: (row + col) % 2 ? 0xcfdbe2 : 0xeae5dc
                })
            );
            plate.position.x = -tileSize / 2 + plateSize / 2 + col * plateSize;
            plate.position.y = -tileSize / 2 + plateSize / 2 + row * plateSize;
            plate.position.z = 3.02;
            plate.receiveShadow = true;
            floor.add(plate);
        }
    }

    return floor;
}
