import * as THREE from "three";
import { tileSize } from "../constants.js";

export const dirLight = new THREE.DirectionalLight();

const shadowDistance = tileSize * 10;

// The tallest thing which throws a shadow - a tree crown, a lightbulb on top
// of a house - so that its top still falls inside the shadow box.
const maxCasterHeight = tileSize * 2;
// Houses and trees standing just outside the screen still throw their shadows
// into it, so the box reaches a little further than the screen does.
const shadowMargin = tileSize * 2;

dirLight.position.set(-shadowDistance, -shadowDistance, 2 * shadowDistance);
dirLight.up.set(0, 0, 1);
dirLight.castShadow = true;

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;

dirLight.shadow.camera.up.set(0, 0, 1);
dirLight.shadow.camera.near = 50;
dirLight.shadow.camera.far = shadowDistance * 10;
// Until the camera is known the box is only a guess, see fitShadowToCamera.
dirLight.shadow.camera.left   = -shadowDistance * 2;
dirLight.shadow.camera.right  =  shadowDistance * 2;
dirLight.shadow.camera.top    =  shadowDistance;
dirLight.shadow.camera.bottom = -shadowDistance;

// The shadow box is measured along the axes of the light, and the light looks
// at the world from another corner than the camera does, and from higher up.
// So the left-right side of the box runs up and down the screen while its
// top-bottom side runs across the screen, and the two are shortened by a
// different amount: a square box covers a piece of screen about twice as wide
// as it is tall. How much box one unit of screen needs is counted here once -
// neither the camera nor the light ever turns, both of them hang off the
// player.
let boxPerScreen = null;

function measureBoxPerScreen(camera) {
  const camX = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const camY = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const camZ = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);

  // Where one unit of screen lands on the ground: step aside along the screen
  // and then slide back along the line of sight until the height is zero.
  const onGround = axis =>
    axis.clone().addScaledVector(camZ, -axis.z / camZ.z);
  const across = onGround(camX);
  const along = onGround(camY);

  // The axes of the shadow box. The light hangs off the player and shines at
  // him, so its place is already the direction it shines from.
  const lightZ = dirLight.position.clone().normalize();
  const lightX = new THREE.Vector3()
    .crossVectors(dirLight.shadow.camera.up, lightZ)
    .normalize();
  const lightY = new THREE.Vector3().crossVectors(lightZ, lightX);
  const worldUp = new THREE.Vector3(0, 0, 1);

  boxPerScreen = {
    leftPerWidth:   Math.abs(across.dot(lightX)),
    leftPerHeight:  Math.abs(along.dot(lightX)),
    leftPerCaster:  Math.abs(worldUp.dot(lightX)),
    topPerWidth:    Math.abs(across.dot(lightY)),
    topPerHeight:   Math.abs(along.dot(lightY)),
    topPerCaster:   Math.abs(worldUp.dot(lightY)),
  };
}

// Make the shadow box hold everything the player can see. Has to be called
// whenever that changes - when he zooms and when the window is resized.
export function fitShadowToCamera(camera) {
  if (!boxPerScreen) measureBoxPerScreen(camera);

  // How much of the world fits on the screen right now.
  const halfWidth  = (camera.right - camera.left)   / (2 * camera.zoom);
  const halfHeight = (camera.top   - camera.bottom) / (2 * camera.zoom);

  const halfLeft = halfWidth * boxPerScreen.leftPerWidth
                 + halfHeight * boxPerScreen.leftPerHeight
                 + maxCasterHeight * boxPerScreen.leftPerCaster
                 + shadowMargin;
  const halfTop  = halfWidth * boxPerScreen.topPerWidth
                 + halfHeight * boxPerScreen.topPerHeight
                 + maxCasterHeight * boxPerScreen.topPerCaster
                 + shadowMargin;

  dirLight.shadow.camera.left   = -halfLeft;
  dirLight.shadow.camera.right  =  halfLeft;
  dirLight.shadow.camera.top    =  halfTop;
  dirLight.shadow.camera.bottom = -halfTop;
  dirLight.shadow.camera.updateProjectionMatrix();
}
