import * as THREE from "three";
import { tileSize } from "../constants";

export function TransferPoint(x, y) {
    const point = new THREE.Mesh(
        new THREE.CapsuleGeometry(5, 8, 4, 4),
        new THREE.MeshLambertMaterial({
            color: 0xffff00,
            flatShading: true,
        })
    );
    point.position.z = 30;

    return point;
}
