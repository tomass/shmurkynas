import * as THREE from "three";
import { tileSize } from "./constants.js";

// Coins thrown into the air from the place where a treasure was dug out. They
// fly up, spread a little to the sides, fall back and fade away.
export const coinBurstGroup = new THREE.Group();

const coinCount = 16;
const lifeTime = 1.3;    // seconds one burst lives
const fadeTime = 0.5;    // seconds of fading at the end of that life
const gravity = 260;     // world units per second squared
const startHeight = 8;
const groundHeight = 4;  // a tile surface is at 3, so the coins lay just above it

// All the coins of all the bursts share one geometry, it never changes.
const coinGeometry = new THREE.CylinderGeometry(6, 6, 1, 12);

const bursts = [];

export function startCoinBurst(x, y) {
    // One material per burst, so that all its coins fade away together.
    const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color("#f6d32d"),
        flatShading: true,
        transparent: true,
    });

    const burst = { startTime: performance.now(), material, coins: [] };

    for (let i = 0; i < coinCount; i++) {
        const mesh = new THREE.Mesh(coinGeometry, material);
        mesh.castShadow = true;
        coinBurstGroup.add(mesh);

        const direction = Math.random() * Math.PI * 2;
        const sideSpeed = 8 + Math.random() * 22;
        burst.coins.push({
            mesh,
            startX: x * tileSize,
            startY: y * tileSize,
            speedX: Math.cos(direction) * sideSpeed,
            speedY: Math.sin(direction) * sideSpeed,
            speedZ: 130 + Math.random() * 60,
            spin: (Math.random() - 0.5) * 12,
        });
    }

    bursts.push(burst);
}

export function animateCoinBursts() {
    const now = performance.now();

    // Counting backwards, because finished bursts are removed on the way.
    for (let i = bursts.length - 1; i >= 0; i--) {
        const burst = bursts[i];
        const time = (now - burst.startTime) / 1000;

        if (time >= lifeTime) {
            burst.coins.forEach(coin => coinBurstGroup.remove(coin.mesh));
            burst.material.dispose();
            bursts.splice(i, 1);
            continue;
        }

        burst.material.opacity = Math.min(1, (lifeTime - time) / fadeTime);

        burst.coins.forEach(coin => {
            const height = startHeight + coin.speedZ * time - 0.5 * gravity * time * time;
            coin.mesh.position.x = coin.startX + coin.speedX * time;
            coin.mesh.position.y = coin.startY + coin.speedY * time;
            // The ones which come down before fading away lay on the ground
            // instead of sinking through it.
            coin.mesh.position.z = Math.max(groundHeight, height);
            coin.mesh.rotation.z = coin.spin * time;
        });
    }
}
