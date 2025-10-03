import * as THREE from "three";

export const dirLight = new THREE.DirectionalLight();

const shadowDistance = 42 * 10;

dirLight.position.set(-shadowDistance, -shadowDistance, 2 * shadowDistance);
dirLight.up.set(0, 0, 1);
dirLight.castShadow = true;

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;

dirLight.shadow.camera.up.set(0, 0, 1);
dirLight.shadow.camera.left   = -shadowDistance * 2;
dirLight.shadow.camera.right  =  shadowDistance * 2;
dirLight.shadow.camera.top    =  shadowDistance;
dirLight.shadow.camera.bottom = -shadowDistance;
dirLight.shadow.camera.near = 50;
dirLight.shadow.camera.far = shadowDistance * 10;

export function setDirLightZoom(zoom) {
  const zoomFactor = 1 / zoom;
  dirLight.shadow.camera.left   = -shadowDistance * zoomFactor;
  dirLight.shadow.camera.right  =  shadowDistance * zoomFactor;
  dirLight.shadow.camera.top    =  shadowDistance * zoomFactor;
  dirLight.shadow.camera.bottom = -shadowDistance * zoomFactor;
  dirLight.shadow.camera.updateProjectionMatrix();
}
