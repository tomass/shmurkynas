import * as THREE from "three";
import { tileSize } from "../constants.js";
import { subjects } from "../../shared/subjects.js";

// How big the top of a desk is and how high above the ground it lays. A tap
// on a desk is looked for on this very board, see collectUserInput.js.
export const deskTop = { width: 34, depth: 22, height: 14 };

// The sign turning above a desk - a set square, a palette - which tells from
// afar what is studied there: how high its middle hangs and how far from that
// middle it reaches. A tap on the sign is a tap on the desk as well.
export const deskSign = { height: 37, radius: 15 };
// A sign is drawn as big as the real thing would be laying on the desk, and
// hung up this many times bigger, so that it is seen from afar.
const signScale = 1.5;

const woodColour = 0xc69468;
const legColour = 0x5a5a5a;
// The indoor floors end at this height, so this is where the legs stand.
const floorHeight = 3;

// A plain school desk: a board on two legs and a pad in the colour of its
// subject. The desks of the subjects - DeskMath, DeskArt - are this very desk
// with a sign hung above it, and a subject which has no desk of its own yet
// gets this one as it is.
export function Desk(x, y, subjectId) {
    const desk = new THREE.Group();
    desk.position.x = x * tileSize;
    desk.position.y = y * tileSize;

    const boardThickness = 2;
    const board = new THREE.Mesh(
        new THREE.BoxGeometry(deskTop.width, deskTop.depth, boardThickness),
        new THREE.MeshLambertMaterial({ color: woodColour })
    );
    board.position.z = deskTop.height - boardThickness / 2;
    board.castShadow = true;
    board.receiveShadow = true;
    desk.add(board);

    const pad = new THREE.Mesh(
        new THREE.BoxGeometry(deskTop.width - 8, deskTop.depth - 6, 0.8),
        new THREE.MeshLambertMaterial({ color: subjects[subjectId].colour })
    );
    pad.position.z = deskTop.height + 0.4;
    pad.receiveShadow = true;
    desk.add(pad);

    // Two legs, one under each end of the board.
    const legHeight = deskTop.height - boardThickness - floorHeight;
    [-1, 1].forEach(side => {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(2, deskTop.depth - 4, legHeight),
            new THREE.MeshLambertMaterial({ color: legColour })
        );
        leg.position.x = side * (deskTop.width / 2 - 3);
        leg.position.z = floorHeight + legHeight / 2;
        leg.castShadow = true;
        desk.add(leg);
    });

    return desk;
}

// Hangs a sign above a desk. The sign is drawn laying flat, the way it would
// lay on a table, and here it is stood up on its edge so that it is seen from
// the side. The desk remembers its sign, because the sign is what keeps
// turning, see animateDesks in main.js.
export function hangSign(desk, flatSign) {
    flatSign.rotation.x = Math.PI / 2;
    flatSign.scale.setScalar(signScale);

    const sign = new THREE.Group();
    sign.position.z = deskSign.height;
    sign.add(flatSign);

    desk.add(sign);
    desk.userData.sign = sign;
    return desk;
}
