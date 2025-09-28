import * as THREE from "three";
import { Renderer } from "./components/Renderer";
import { Camera } from "./components/Camera";
import { DirectionalLight } from "./components/DirectionalLight";
import { player, initializePlayer } from "./components/Player";
import { map, initialiseMap, initialiseMapData } from "./components/Map";
import { animateVehicles } from "./animateVehicles";
import "./style.css";
import { collectUserInput } from "./collectUserInput";
import { animatePlayer } from "./animatePlayer";
import { hitTest } from "./utilies/hitTest";
import { initializePathfinding } from "./utilies/findPath";
import "./websocket.js";

const scene = new THREE.Scene();
scene.add(player);
scene.add(map);

const ambientLight = new THREE.AmbientLight();
scene.add(ambientLight);

const dirLight = DirectionalLight();
dirLight.target = player;
player.add(dirLight);

const camera = Camera();
player.add(camera);

collectUserInput(camera);

downloadMap();

function downloadMap() {
  fetch('/base.map')
    .then(response => {
      if (!response.ok) throw new Error('Nepavyko įkelti failo');
      return response.text();
    })
    .then(text => {
      const array2D = text.split('\n').map(line => line.split(''));
      initialiseMapData(array2D);
      initialiseGame();
    })
    .catch(error => {
      console.error('Error loading basemap file:', error);
    });
} // initialiseMap

function initialiseGame() {
  initializePlayer();
  initialiseMap();
  initializePathfinding();
}

const renderer = Renderer();
renderer.setAnimationLoop(animate);

function animate() {
  //animateVehicles();
  animatePlayer();
  //hitTest();

  renderer.render(scene, camera);
}
