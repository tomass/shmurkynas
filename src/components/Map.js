import * as THREE from "three";
import { Grass } from "./Grass";
import { Road } from "./Road";
import { Tree } from "./Tree";
import { Building } from "./Building";
import { Water } from "./Water";
import { Car } from "./Car";
import { Truck } from "./Truck";

export let mapData = [];

export const map = new THREE.Group();

export function initialiseMapData(downloadedMap) {
  mapData = downloadedMap.reverse();
  // transformuojame, kad atitiktų vizualiai tai, kas žemėlapyje
  //for (let y = 0; y < mapData.length; y++) {
  //  for (let x = 0; x < mapData[y].length; x++) {
  //    mapData[y][x] = downloadedMap[mapData.length - y - 1][x];
  //  }
  //}
}

export function initialiseMap() {
    map.remove(...map.children);

    for (let y = 0; y < mapData.length; y++) {
      for (let x = 0; x < mapData[y].length; x++) {
        addTile(x, y, mapData[y][x]);
      }
    }
}

function addTile(x, y, type) {
  if (type === "G") {
    const road = Road(x, y);
    map.add(road);
  } else if (type === "P") {
    const building = Building(x, y);
    map.add(building);
  } else if (type === "M") {
    const grass = Grass(x, y);
    map.add(grass);
    const tree = Tree(x, y);
    map.add(tree);
  } else if (type === "V") {
    const water = Water(x, y);
    map.add(water);
  } else /*(type === "Ž")*/ {
    const grass = Grass(x, y);
    map.add(grass);
  }
}
