import * as THREE from "three";
import { Renderer } from "./components/Renderer";
import { Camera } from "./components/Camera";
import { dirLight } from "./components/DirectionalLight";
import { player, initializePlayer } from "./components/Player";
import { map, initialiseMap, initialiseMapData } from "./components/Map";
import { otherPlayers, addOtherPlayer } from "./otherPlayers.js";
import { animateVehicles } from "./animateVehicles";
import "./style.css";
import { collectUserInput } from "./collectUserInput";
import { animatePlayer } from "./animatePlayer";
import { hitTest } from "./utilies/hitTest";
import { initializePathfinding } from "./utilies/findPath";
import { parseMapData } from "./utilies/mapParser.js";
import "./websocket.js";

const scene = new THREE.Scene();
scene.add(player);
scene.add(map);
scene.add(otherPlayers);

const ambientLight = new THREE.AmbientLight();
scene.add(ambientLight);

dirLight.target = player;
player.add(dirLight);

const camera = Camera();
player.add(camera);

const initialShadowFrustum = {
    left: dirLight.shadow.camera.left,
    right: dirLight.shadow.camera.right,
    top: dirLight.shadow.camera.top,
    bottom: dirLight.shadow.camera.bottom,
};

function handleZoom(zoom) {
    camera.setZoom(zoom);

    dirLight.shadow.camera.left = initialShadowFrustum.left / camera.zoom;
    dirLight.shadow.camera.right = initialShadowFrustum.right / camera.zoom;
    dirLight.shadow.camera.top = initialShadowFrustum.top / camera.zoom;
    dirLight.shadow.camera.bottom = initialShadowFrustum.bottom / camera.zoom;
    dirLight.shadow.camera.updateProjectionMatrix();
}

collectUserInput(camera, handleZoom);

const mapLoadedPromise = new Promise((resolve, reject) => {
  fetch('/base.map')
    .then(response => {
      if (!response.ok) throw new Error('Nepavyko įkelti failo');
      return response.text();
    })
    .then(text => {
      const maps = parseMapData(text);
      initialiseMapData(maps);
      resolve();
    })
    .catch(error => {
      console.error('Error loading basemap file:', error);
      reject(error);
    });
});

const gameInitPromise = new Promise(resolve => {
  window.addEventListener('game-init', e => {
    resolve(e.detail);
  }, { once: true });
});

Promise.all([mapLoadedPromise, gameInitPromise]).then(([_, initData]) => {
  const { x, y, players } = initData;
  initializePlayer(x, y);
  players.forEach(playerInfo => {
    addOtherPlayer(playerInfo);
  });
  initialiseMap();
  initializePathfinding();
});

const renderer = Renderer();
renderer.setAnimationLoop(animate);

function animate() {
  //animateVehicles();
  animatePlayer();
  //hitTest();

  renderer.render(scene, camera);
}
