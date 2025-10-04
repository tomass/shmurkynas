import * as THREE from "three";
import { Renderer } from "./components/Renderer";
import { Camera } from "./components/Camera";
import { dirLight, setDirLightZoom } from "./components/DirectionalLight";
import { player, initializePlayer } from "./components/Player";
import { map, initialiseMap, initialiseMapData, maps } from "./components/Map";
import { otherPlayers, addOtherPlayer } from "./otherPlayers.js";
import { animateVehicles } from "./animateVehicles";
import { findFirstWalkablePosition } from "./utilies/findFirstWalkablePosition.js";
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

function handleZoom(zoom) {
    camera.setZoom(zoom);
    setDirLightZoom(zoom);
}

collectUserInput(camera, handleZoom);

window.addEventListener('map-transfer', e => {
  const { mapName } = e.detail;
  if (maps[mapName]) {
    const newMapData = maps[mapName].tiles;
    const newPosition = findFirstWalkablePosition(newMapData);

    if (newPosition) {
      // The y-coordinate needs to be inverted because the findFirstWalkablePosition
      // works with the raw tile data, where y=0 is the top.
      // The player's logical position has y=0 at the bottom.
      const logicalY = newMapData.length - 1 - newPosition.y;

      initialiseMap(mapName);
      initializePlayer(newPosition.x, logicalY);
      initializePathfinding(); // Re-initialize pathfinding with the new map
    } else {
      console.error(`No walkable position found on map: ${mapName}`);
    }
  } else {
    console.error(`Map '${mapName}' not found for transfer.`);
  }
});

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
