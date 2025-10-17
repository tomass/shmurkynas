import * as THREE from "three";
import { Renderer } from "./components/Renderer";
import { Camera } from "./components/Camera";
import { dirLight, setDirLightZoom } from "./components/DirectionalLight";
import { player, initializePlayer } from "./components/Player";
import { map, initialiseMap, initialiseMapData, switchToMap, gamePointsGroup } from "./components/Map";
import { otherPlayers, updateOtherPlayer } from "./otherPlayers.js";
import { animateVehicles } from "./animateVehicles";
import "./style.css";
import { collectUserInput } from "./collectUserInput";
import { animatePlayer } from "./animatePlayer";
import { hitTest } from "./utilies/hitTest";
import { initializePathfinding } from "./utilies/findPath";
import { parseMapData } from "../shared/mapParser.js";
import { connect, sendMessage } from "./websocket.js";
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

window.addEventListener('load', () => {
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i).startsWith('treasureMap_')) {
      document.getElementById('show-maps-button').style.display = 'block';
      break;
    }
  }
});

Promise.all([mapLoadedPromise, gameInitPromise]).then(([_, initData]) => {
  const { x, y, map, name, money, colour, players } = initData;
  initializePlayer(x, y, name, money, colour);
  initialiseMap(map);
  players.forEach(playerInfo => {
    updateOtherPlayer(playerInfo);
  });
  initializePathfinding();
});

const renderer = Renderer();
renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
    camera.handleResize();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animateCoins() {
    gamePointsGroup.children.forEach(coin => {
        coin.rotation.z += 0.01;
    });
}

function animate() {
  //animateVehicles();
  animatePlayer();
  animateCoins();
  //hitTest();

  renderer.render(scene, camera);
}

const showMapsButton = document.getElementById('show-maps-button');
const mapViewer = document.getElementById('map-viewer');
const mapImageContainer = document.getElementById('map-image-container');
const closeMapViewerButton = document.getElementById('close-map-viewer-button');
const prevMapButton = document.getElementById('prev-map-button');
const nextMapButton = document.getElementById('next-map-button');

let collectedMapImages = [];
let currentMapIndex = 0;

function updateMapViewer() {
  if (collectedMapImages.length === 0) {
    mapImageContainer.innerHTML = '';
    return;
  }
  mapImageContainer.innerHTML = `<img src="${collectedMapImages[currentMapIndex]}" />`;
  prevMapButton.style.display = collectedMapImages.length > 1 ? 'block' : 'none';
  nextMapButton.style.display = collectedMapImages.length > 1 ? 'block' : 'none';
}

showMapsButton.addEventListener('click', () => {
  collectedMapImages = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('treasureMap_')) {
      collectedMapImages.push(localStorage.getItem(key));
    }
  }
  currentMapIndex = 0;
  updateMapViewer();
  mapViewer.style.display = 'block';
});

closeMapViewerButton.addEventListener('click', () => {
  mapViewer.style.display = 'none';
});

prevMapButton.addEventListener('click', () => {
  currentMapIndex = (currentMapIndex - 1 + collectedMapImages.length) % collectedMapImages.length;
  updateMapViewer();
});

nextMapButton.addEventListener('click', () => {
  currentMapIndex = (currentMapIndex + 1) % collectedMapImages.length;
  updateMapViewer();
});
