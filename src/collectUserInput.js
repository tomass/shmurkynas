import * as THREE from "three";
import { tileSize } from "./constants";
import { queueMove, playerData as position } from "./components/Player";
import { currentPoints, switchToMap } from "./components/Map";
import { findPath, initializePathfinding } from "./utilies/findPath";
import { sendMessage } from "./websocket";

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
        const settingsDialog = document.getElementById('settings-dialog');
        // If the touch is inside the settings dialog, do NOT prevent default
        if (settingsDialog && settingsDialog.style.display === 'block' && settingsDialog.contains(event.target)) {
            return; // Allow default behavior for the dialog
        }
        if (event.touches.length === 2) {
            isPinching = true;
            initialTouchDistance = getTouchDistance(event.touches);
        }
        event.preventDefault();
    }, { passive: false });

    window.addEventListener('touchmove', event => {
        const settingsDialog = document.getElementById('settings-dialog');
        // If the touch is inside the settings dialog, do NOT prevent default
        if (settingsDialog && settingsDialog.style.display === 'block' && settingsDialog.contains(event.target)) {
            return; // Allow default behavior for the dialog
        }
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
        const toolbar = document.getElementById('toolbar');
        const settingsContainer = document.getElementById('settings-container');
        if (toolbar.contains(event.target) || (settingsContainer && settingsContainer.contains(event.target))) {
            return;
        }

        if (isPinching) return;
        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components
        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersect);

        const to = {
            x: Math.round(intersect.x / tileSize),
            y: Math.round(intersect.y / tileSize),
        }
        if (Math.abs(position.x - to.x) <= 1 && Math.abs(position.y - to.y) <= 1) {
            const clickedPoint = currentPoints.find(p => p.type === "transfer" && p.x === to.x && p.y === to.y);
            console.log('clicked point:', clickedPoint);
            if (clickedPoint) {
              console.log('transfer to map:', clickedPoint.map, clickedPoint.map_x, clickedPoint.map_y);
              switchToMap(clickedPoint.map, initializePathfinding, clickedPoint.map_x, clickedPoint.map_y);
              sendMessage({ type: 'mapTransfer', map: clickedPoint.map });
              return;
            }
        }
        
        findPath({x: position.x, y: position.y}, to)
            .then(path => {
                for (let i = 1; i < path.length; i++) {
                    if (path[i].x > path[i-1].x) queueMove("right");
                    else if (path[i].x < path[i-1].x) queueMove("left");
                    else if (path[i].y > path[i-1].y) queueMove("forward");
                    else if (path[i].y < path[i-1].y) queueMove("backward");
                }
            })
            .catch(error => console.log(error));
    }
}
