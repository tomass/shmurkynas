import * as THREE from "three";
import { queueMove, position } from "./components/Player";
import { findPath } from "./utilies/findPath";
import { tileSize } from "./constants";
import { currentPoints, mapData } from "./components/Map";

export function collectUserInput(camera, handleZoom) {
    window.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            queueMove("forward");
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            queueMove("backward");
        } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            queueMove("left");
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            queueMove("right");
        }
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    window.addEventListener( 'pointerdown', onPointerDown, false );

    window.addEventListener('wheel', event => {
        const zoomFactor = event.deltaY > 0 ? 1 / 1.1 : 1.1;
        handleZoom(camera.zoom * zoomFactor);
    });

    let initialTouchDistance = 0;
    let isPinching = false;

    window.addEventListener('touchstart', event => {
        if (event.touches.length === 2) {
            isPinching = true;
            initialTouchDistance = getTouchDistance(event.touches);
        }
        event.preventDefault();
    }, { passive: false });

    window.addEventListener('touchmove', event => {
        if (isPinching && event.touches.length === 2) {
            const currentTouchDistance = getTouchDistance(event.touches);
            const zoomFactor = currentTouchDistance / initialTouchDistance;
            handleZoom(camera.zoom * zoomFactor);
            initialTouchDistance = currentTouchDistance;
        }
        event.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', () => {
        isPinching = false;
    });

    function getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function onPointerDown( event ) {
        if (isPinching) return;
        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components
        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersect);

        const clickX = Math.round(intersect.x / tileSize);
        const clickY = Math.round(intersect.y / tileSize);

        // Convert click from render coordinates to logical coordinates to check for points
        const logicalY = mapData.length - 1 - clickY;
        const clickedPoint = currentPoints.find(p => p.type === "transfer" && p.x === clickX && p.y === logicalY);

        if (clickedPoint) {
            const dx = Math.abs(position.x - clickedPoint.x);
            const dy = Math.abs(position.y - clickedPoint.y);

            // Check if player is on an adjacent tile (8 directions)
            if (dx <= 1 && dy <= 1 && (dx !== 0 || dy !== 0)) {
                // Dispatch an event to notify other parts of the app to handle the map transfer
                window.dispatchEvent(new CustomEvent('map-transfer', { detail: { mapName: clickedPoint.map } }));
                return; // Don't proceed to pathfinding
            }
        }

        const to = {
            x: clickX,
            y: clickY,
        }

        // Pathfinding expects grid coordinates (render coordinates).
        // Player position is in logical coordinates, so we convert it.
        const start = {
            x: position.x,
            y: mapData.length - 1 - position.y
        }

        findPath(start, to)
            .then(path => {
                for (let i = 1; i < path.length; i++) {
                    if (path[i].x > path[i-1].x) queueMove("right");
                    else if (path[i].x < path[i-1].x) queueMove("left");
                    else if (path[i].y < path[i-1].y) queueMove("forward"); // Moving up on screen (render-y decreases) is forward (logical-y increases)
                    else if (path[i].y > path[i-1].y) queueMove("backward"); // Moving down on screen (render-y increases) is backward (logical-y decreases)
                }
            })
            .catch(error => console.log(error));
    }
}
