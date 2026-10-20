import * as THREE from "three";
import { tileSize } from "./constants";
import { queueMove, playerData as position } from "./components/Player";
import { currentPoints, switchToMap } from "./components/Map";
import { findPath, initializePathfinding } from "./utilies/findPath";
import { sendMessage } from "./websocket";
import { playerData, updatePlayerMoney } from "./components/Player";
import { showLivingDialog } from "./livingDialog";

export function collectUserInput(camera, handleZoom) {
    const digButton = document.getElementById('dig-button');
    digButton.addEventListener('click', () => {
        if (playerData.money > 0) {
            updatePlayerMoney(playerData.money - 1);
            sendMessage({ type: 'digging' });
        }
    });

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

    // A tap is only answered when the finger is lifted. While the finger is
    // still down we cannot yet know whether a second one is on its way, and a
    // second finger means zooming, not walking.
    window.addEventListener( 'pointerdown', onPointerDown, false );
    window.addEventListener( 'pointermove', onPointerMove, false );
    window.addEventListener( 'pointerup', onPointerUp, false );
    window.addEventListener( 'pointercancel', onPointerCancel, false );

    window.addEventListener('wheel', event => {
        const zoomFactor = event.deltaY > 0 ? 1 / 1.1 : 1.1;
        handleZoom(camera.zoom * zoomFactor);
    });

    let initialTouchDistance = 0;
    let isPinching = false;
    // Stays true from the moment a second finger lands until the hand leaves
    // the screen completely, so that the leftovers of a pinch are not mistaken
    // for a tap.
    let gestureHadMultiTouch = false;
    // The tap which is waiting to be answered, remembered from its beginning.
    let pendingTap = null;
    // A finger is never as still as a mouse, so a little wandering is forgiven.
    const tapMoveTolerance = 12;

    window.addEventListener('touchstart', event => {
        const settingsDialog = document.getElementById('settings-dialog');
        // If the touch is inside the settings dialog, do NOT prevent default
        if (settingsDialog && settingsDialog.style.display === 'block' && settingsDialog.contains(event.target)) {
            return; // Allow default behavior for the dialog
        }
        const toolbar = document.getElementById('toolbar');
        if (toolbar.contains(event.target)) {
            return; // Allow default behavior for the dialog
        }
        const mapViewer = document.getElementById('map-viewer');
        if (mapViewer.contains(event.target)) {
            return; // Allow default behavior for the dialog
        }
        const livingContainer = document.getElementById('living-container');
        if (livingContainer && livingContainer.contains(event.target)) {
            return; // Allow default behavior for the dialog
        }
        if (event.touches.length >= 2) {
            isPinching = true;
            gestureHadMultiTouch = true;
            pendingTap = null;
        }
        if (event.touches.length === 2) {
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
        const toolbar = document.getElementById('toolbar');
        if (toolbar.contains(event.target)) {
            return; // Allow default behavior for the dialog
        }
        const mapViewer = document.getElementById('map-viewer');
        if (mapViewer.contains(event.target)) {
            return; // Allow default behavior for the dialog
        }
        const livingContainer = document.getElementById('living-container');
        if (livingContainer && livingContainer.contains(event.target)) {
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

    // One finger lifted from a pinch still leaves the other one on the screen,
    // so the gesture is only over when the last finger is gone.
    function onTouchFinished(event) {
        if (event.touches.length < 2) {
            isPinching = false;
        }
        if (event.touches.length === 0) {
            gestureHadMultiTouch = false;
        }
    }

    window.addEventListener('touchend', onTouchFinished);
    window.addEventListener('touchcancel', onTouchFinished);

    function getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function onPointerDown( event ) {
        const toolbar = document.getElementById('toolbar');
        const settingsContainer = document.getElementById('settings-container');
        const livingContainer = document.getElementById('living-container');
        if (toolbar.contains(event.target) ||
            (settingsContainer && settingsContainer.contains(event.target)) ||
            (livingContainer && livingContainer.contains(event.target))) {
            pendingTap = null;
            return;
        }

        if (isPinching || gestureHadMultiTouch) {
            pendingTap = null;
            return;
        }

        pendingTap = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
        };
    }

    function onPointerMove( event ) {
        if (!pendingTap || event.pointerId !== pendingTap.pointerId) return;
        // A finger which is dragged across the screen is not asking the
        // character to go anywhere.
        if (Math.abs(event.clientX - pendingTap.x) > tapMoveTolerance ||
            Math.abs(event.clientY - pendingTap.y) > tapMoveTolerance) {
            pendingTap = null;
        }
    }

    function onPointerCancel( event ) {
        if (pendingTap && event.pointerId === pendingTap.pointerId) {
            pendingTap = null;
        }
    }

    function onPointerUp( event ) {
        const tap = pendingTap;
        pendingTap = null;
        if (!tap || event.pointerId !== tap.pointerId) return;
        // The second finger of a zoom also has to be lifted some time, and
        // that lifting must not send anybody walking.
        if (isPinching || gestureHadMultiTouch) return;
        moveToPointer(event);
    }

    function moveToPointer( event ) {
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
            const clickedPoint = currentPoints.find(p => p.x === to.x && p.y === to.y);
            if (clickedPoint && clickedPoint.type === "transfer") {
              console.log('transfer to map:', clickedPoint.map, clickedPoint.map_x, clickedPoint.map_y);
              switchToMap(clickedPoint.map, initializePathfinding, clickedPoint.map_x, clickedPoint.map_y);
              sendMessage({ type: 'mapTransfer', map: clickedPoint.map });
              return;
            }
            if (clickedPoint && clickedPoint.type === "living") {
              // A house is not walked onto, it is bought or knocked on.
              showLivingDialog(clickedPoint);
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
