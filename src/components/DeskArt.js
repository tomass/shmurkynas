import * as THREE from "three";
import { Desk, hangSign } from "./Desk.js";

const boardColour = 0xe8c48a;
const paintColours = [0xe63946, 0xff9f1c, 0xffd23f, 0x2ec27e, 0x3a86ff, 0x9b5de5];
const thickness = 1.4;

// The desk of art: a painter's palette turns above it.
export function DeskArt(x, y) {
    return hangSign(Desk(x, y, 'art'), Palette());
}

// A painter's palette - an oval board with a hole for the thumb and blobs of
// paint along its edge - drawn laying flat, with the middle of it at 0, 0.
function Palette() {
    const palette = new THREE.Group();

    const width = 10;
    const height = 7.5;
    const outline = new THREE.Shape();
    outline.absellipse(0, 0, width, height, 0, Math.PI * 2);

    const thumbHole = new THREE.Path();
    thumbHole.absarc(5, -2.5, 1.8, 0, Math.PI * 2);
    outline.holes.push(thumbHole);

    const board = new THREE.Mesh(
        new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false }),
        new THREE.MeshLambertMaterial({ color: boardColour })
    );
    board.position.z = -thickness / 2;
    board.castShadow = true;
    palette.add(board);

    // The blobs of paint are laid in a bow along the edge which is away from
    // the thumb. They go right through the board, so that the paint shows on
    // both faces of it.
    paintColours.forEach((colour, index) => {
        const angle = Math.PI * (0.3 + 0.2 * index);
        const blob = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.6, thickness + 1, 10),
            new THREE.MeshLambertMaterial({ color: colour })
        );
        // A cylinder is made standing along y, here it has to go through the
        // board, which is along z.
        blob.rotation.x = Math.PI / 2;
        blob.position.x = Math.cos(angle) * width * 0.68;
        blob.position.y = Math.sin(angle) * height * 0.66;
        palette.add(blob);
    });

    return palette;
}
