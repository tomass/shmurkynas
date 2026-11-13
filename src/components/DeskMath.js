import * as THREE from "three";
import { Desk, hangSign } from "./Desk.js";

const plasticColour = 0xffd23f;
const markColour = 0x3d3846;
const thickness = 1.6;

// The desk of mathematics: a set square turns above it.
export function DeskMath(x, y) {
    return hangSign(Desk(x, y, 'math'), SetSquare());
}

// A set square - a ruler in the shape of a triangle with a triangular hole in
// the middle - drawn laying flat, with the middle of it at 0, 0.
function SetSquare() {
    const setSquare = new THREE.Group();

    const outline = new THREE.Shape();
    outline.moveTo(-9, -7);
    outline.lineTo(9, -7);
    outline.lineTo(-9, 7);
    outline.closePath();

    // The hole keeps the same distance from all three sides.
    const hole = new THREE.Path();
    hole.moveTo(-6, -4);
    hole.lineTo(0.3, -4);
    hole.lineTo(-6, 0.9);
    hole.closePath();
    outline.holes.push(hole);

    const plate = new THREE.Mesh(
        new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false }),
        new THREE.MeshLambertMaterial({ color: plasticColour })
    );
    plate.position.z = -thickness / 2;
    plate.castShadow = true;
    setSquare.add(plate);

    // The marks of a ruler along the bottom side. They are a little thicker
    // than the plate, so that they show on both faces of it.
    for (let markX = -7; markX <= 5; markX += 2) {
        const isLong = (markX + 7) % 4 === 0;
        const markHeight = isLong ? 2 : 1.2;
        const mark = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, markHeight, thickness + 0.3),
            new THREE.MeshLambertMaterial({ color: markColour })
        );
        mark.position.x = markX;
        mark.position.y = -7 + markHeight / 2;
        setSquare.add(mark);
    }

    return setSquare;
}
