import * as THREE from "three";
import { tileSize } from "../constants.js";

export function Building(x, y) {
    const building = new THREE.Group();
    building.position.x = x * tileSize;
    building.position.y = y * tileSize;

    const base = new THREE.Mesh(
        new THREE.BoxGeometry(tileSize, tileSize, 40),
        new THREE.MeshLambertMaterial({
            color: 0x4d2926,
            flatShading: true,
        })
    );
    base.position.z = 20;
    base.castShadow = true;
    base.receiveShadow = true;
    building.add(base);

    const window = new THREE.Mesh(
        new THREE.BoxGeometry(17, 1, 17),
        new THREE.MeshLambertMaterial({
            color: 0x00aaff,
            flatShading: true,
        })
    );
    window.position.y = -22;
    window.position.z = 25;
    window.receiveShadow = true;
    building.add(window);

    const window2 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 17, 17),
        new THREE.MeshLambertMaterial({
            color: 0x00aaff,
            flatShading: true,
        })
    );
    window2.position.x = 22;
    window2.position.z = 25;
    window2.receiveShadow = true;
    building.add(window2);

    return building;
}
