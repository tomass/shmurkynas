import * as THREE from "three";

export function Camera() {
  const size = 300;
  const viewRatio = window.innerWidth / window.innerHeight;
  const width  = viewRatio < 1 ? size : size * viewRatio;
  const height = viewRatio < 1 ? size / viewRatio : size;
  const viewWidth = 1;

  const camera = new THREE.OrthographicCamera(
    viewWidth * width  / -1, // left
    viewWidth * width  /  1, // right
    viewWidth * height /  1, // top
    viewWidth * height / -1, // bottom
    100,                     // near
    1500 * viewWidth         // far
  );

  camera.up.set(0, 0, 1);
  camera.position.set(300, -300, 300);
  camera.lookAt(0, 0, 0);

  camera.minZoom = 0.5;
  camera.maxZoom = 2.0;

  camera.setZoom = function(zoom) {
    const newZoom = Math.max(this.minZoom, Math.min(zoom, this.maxZoom));
    this.zoom = newZoom;
    this.updateProjectionMatrix();
  }

  camera.setZoom(1.0);

  return camera;
}
