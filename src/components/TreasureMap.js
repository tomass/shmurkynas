import * as THREE from "three";
import { tileSize } from "../constants.js";

// A treasure map laying on the ground: a white sheet with a red cross marking
// the place of the treasure. It stands upright like the coin does and is spun
// around by animateCoins() in main.js, so both of its sides are seen.
export function TreasureMap(x, y) {
    const point = new THREE.Group();

    const sheetWidth = 30;
    const sheetHeight = 22;
    const sheetThickness = 1.5;

    const sheet = new THREE.Mesh(
        new THREE.BoxGeometry(sheetWidth, sheetThickness, sheetHeight),
        new THREE.MeshLambertMaterial({
            color: new THREE.Color("#f6f5f4"),
            flatShading: true,
        })
    );
    sheet.castShadow = true;
    point.add(sheet);

    // Two bars crossing each other make the red X of the treasure place. They are
    // thicker than the sheet, so that the cross is seen from both of its sides.
    const crossMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color("#e71607"),
        flatShading: true,
    });
    [Math.PI / 4, -Math.PI / 4].forEach(angle => {
        const bar = new THREE.Mesh(
            new THREE.BoxGeometry(16, sheetThickness + 1, 3),
            crossMaterial
        );
        bar.rotation.y = angle;
        bar.castShadow = true;
        point.add(bar);
    });

    point.position.z = 17;
    point.position.x = x * tileSize;
    point.position.y = y * tileSize;

    return point;
}
