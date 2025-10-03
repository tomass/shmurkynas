import * as THREE from "three";

export function Camera() {
  const size = 42 * 10; // initially visible tiles
  const viewRatio = window.innerWidth / window.innerHeight;
  const width  = viewRatio < 1 ? size : size * viewRatio;
  const height = viewRatio < 1 ? size / viewRatio : size;
  const viewWidth = 1;

  // Store initial boundaries for reference
  const initialLeft   = viewWidth * width  / -1;
  const initialRight  = viewWidth * width  /  1;
  const initialTop    = viewWidth * height /  1;
  const initialBottom = viewWidth * height / -1;

  let distance = initialRight - initialLeft;
  const camera = new THREE.OrthographicCamera(
    initialLeft, initialRight, initialTop, initialBottom,
    50, // near
    distance * 2.8 // far
  );

  camera.up.set(0, 0, 1);
  camera.position.set(distance, -distance, distance);
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
