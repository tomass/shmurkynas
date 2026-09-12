import * as THREE from "three";
import { Renderer } from "./components/Renderer";
import { Camera } from "./components/Camera";
import { dirLight, setDirLightZoom } from "./components/DirectionalLight";
import { player, initializePlayer } from "./components/Player";
import { map, initialiseMap, initialiseMapData, switchToMap, gamePointsGroup } from "./components/Map";
import { coinBurstGroup, animateCoinBursts } from "./coinBurst";
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
import { collectedMapImages } from "./collectedMaps.js";

const scene = new THREE.Scene();
scene.add(player);
scene.add(map);
scene.add(otherPlayers);
scene.add(coinBurstGroup);

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

window.addEventListener('DOMContentLoaded', () => {
  connect();
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
  animateCoinBursts();
  //hitTest();

  renderer.render(scene, camera);
}

const showMapsButton = document.getElementById('show-maps-button');
const mapViewer = document.getElementById('map-viewer');
const mapImageContainer = document.getElementById('map-image-container');
const closeMapViewerButton = document.getElementById('close-map-viewer-button');
const prevMapButton = document.getElementById('prev-map-button');
const nextMapButton = document.getElementById('next-map-button');

let viewerImages = [];
let currentMapIndex = 0;

function isValidImageUrl(url) {
  return (
    typeof url === 'string' &&
    (url.startsWith('http://') ||
     url.startsWith('https://') ||
     url.startsWith('data:image/'))
  );
}

function updateMapViewer() {
  if (viewerImages.length === 0) {
    mapImageContainer.textContent = '';
    return;
  }

  const url = viewerImages[currentMapIndex];
  if (!isValidImageUrl(url)) {
    console.error('Invalid image URL:', url);
    mapImageContainer.textContent = 'Invalid map image';
    return;
  }

  const img = document.createElement('img');
  img.src = url;
  mapImageContainer.textContent = '';
  mapImageContainer.appendChild(img);
  prevMapButton.style.display = viewerImages.length > 1 ? 'block' : 'none';
  nextMapButton.style.display = viewerImages.length > 1 ? 'block' : 'none';
}

showMapsButton.addEventListener('click', async () => {
  viewerImages = await collectedMapImages();
  currentMapIndex = 0;
  updateMapViewer();
  mapViewer.style.display = 'block';
});

closeMapViewerButton.addEventListener('click', () => {
  mapViewer.style.display = 'none';
});

prevMapButton.addEventListener('click', () => {
  currentMapIndex = (currentMapIndex - 1 + viewerImages.length) % viewerImages.length;
  updateMapViewer();
});

nextMapButton.addEventListener('click', () => {
  currentMapIndex = (currentMapIndex + 1) % viewerImages.length;
  updateMapViewer();
});
