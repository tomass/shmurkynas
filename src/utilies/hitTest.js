import * as THREE from "three";
import { mapData } from "../components/Map";
import { player/*, position*/ } from "../components/Player";

const resultDOM = document.getElementById("result-container");
const finalScoreDOM = document.getElementById("final-score");

export function hitTest() {
  /*const row = rows[position.currentRow - 1];
  if (!row) return;

  if (row.type === "car" || row.type === "truck") {
    const playerBoundingBox = new THREE.Box3();
    playerBoundingBox.setFromObject(player);

    row.vehicles.forEach(({ref}) => {
      if (!ref) throw Error("Vehicle reference is missing");
      const VehicleBoundingBox = new THREE.Box3();
      VehicleBoundingBox.setFromObject(ref);

      if (playerBoundingBox.intersectsBox(VehicleBoundingBox)) {
        if (!resultDOM || !finalScoreDOM) return;
        position.isActive = false;
        resultDOM.style.visibility = "visible";
        finalScoreDOM.innerText = position.currentRow.toString();
      }
    })
  }*/
}
