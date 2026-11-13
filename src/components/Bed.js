import * as THREE from "three";
import { tileSize } from "../constants.js";

// A bed as wide as two tiles. It is built around the middle of those two
// tiles, so whoever draws it only has to say where that middle is - and a bed
// which is turned around can simply be turned as a whole.
export function Bed() {
    const bed = new THREE.Group();

    const length = tileSize * 2 - 8;
    const width = tileSize - 10;

    const frame = new THREE.Mesh(
        new THREE.BoxGeometry(length, width, 6),
        new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
    );
    frame.position.z = 8;
    frame.castShadow = true;
    frame.receiveShadow = true;
    bed.add(frame);

    const mattress = new THREE.Mesh(
        new THREE.BoxGeometry(length - 6, width - 4, 5),
        new THREE.MeshLambertMaterial({ color: 0xfdf6e3 })
    );
    mattress.position.z = 13;
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    bed.add(mattress);

    // The blanket covers the half of the bed one lays the legs on, so that it
    // is easy to see which way round the bed is standing.
    const blanket = new THREE.Mesh(
        new THREE.BoxGeometry((length - 6) * 0.6, width - 4, 2),
        new THREE.MeshLambertMaterial({ color: 0x3584e4 })
    );
    blanket.position.set((length - 6) * 0.2, 0, 16);
    blanket.castShadow = true;
    blanket.receiveShadow = true;
    bed.add(blanket);

    const pillow = new THREE.Mesh(
        new THREE.BoxGeometry(12, width - 10, 4),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    pillow.position.set(-length / 2 + 12, 0, 17);
    pillow.castShadow = true;
    pillow.receiveShadow = true;
    bed.add(pillow);

    const headboard = new THREE.Mesh(
        new THREE.BoxGeometry(4, width, 18)
    , new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
    );
    headboard.position.set(-length / 2 + 2, 0, 14);
    headboard.castShadow = true;
    headboard.receiveShadow = true;
    bed.add(headboard);

    return bed;
}
