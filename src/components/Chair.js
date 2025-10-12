import * as THREE from "three";
import { tileSize } from "../constants";

export function Chair(x, y) {
    const chair = new THREE.Group();
    chair.position.x = x * tileSize;
    chair.position.y = y * tileSize;

    const atlosas = new THREE.Mesh(
        new THREE.BoxGeometry(10, 10, 3.4),
        new THREE.MeshLambertMaterial({ color: 0xb5835a })
    );
    atlosas.position.z = 13;
    atlosas.receiveShadow = true;
    atlosas.castShadow = true;
    chair.add(atlosas);

    const pagalvele = new THREE.Mesh(
        new THREE.BoxGeometry(10, 10, 1),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    pagalvele.position.z = 15;
    pagalvele.receiveShadow = true;
    pagalvele.castShadow = true;
    chair.add(pagalvele);

    const part2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 10, 14.2),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#b5835a") })
    );
    part2.position.set(-5, 0, 19);
    chair.add(part2);
    part2.castShadow = true;

    const part3 = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 6.7, 12.9),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#5a5a5a") })
     );
    part3.position.set(0, 0, 5);
    chair.add(part3);
    part3.castShadow = true;


    return chair;
}
