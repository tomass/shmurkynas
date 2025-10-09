import * as THREE from "three";
import { Renderer } from "./components/Renderer";
import { Camera } from "./components/Camera";
import { dirLight, setDirLightZoom } from "./components/DirectionalLight";
import { player, initializePlayer } from "./components/Player";
import { map, initialiseMap, initialiseMapData } from "./components/Map";
import { otherPlayers, addOtherPlayer } from "./otherPlayers.js";
import { animateVehicles } from "./animateVehicles";
import "./style.css";
import { collectUserInput } from "./collectUserInput";
import { animatePlayer } from "./animatePlayer";
import { hitTest } from "./utilies/hitTest";
import { initializePathfinding } from "./utilies/findPath";
import { parseMapData } from "../shared/mapParser.js";
import { connect } from "./websocket.js";
import "./settings.js";

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

connect();

Promise.all([mapLoadedPromise, gameInitPromise]).then(([_, initData]) => {
  const { x, y, name, money, colour, players } = initData;
  initializePlayer(x, y, name, money, colour);
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
