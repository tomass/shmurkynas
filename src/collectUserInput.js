import * as THREE from "three";
import { queueMove, position } from "./components/Player";
import { findPath } from "./utilies/findPath";
import { tileSize } from "./constants";

export function collectUserInput(camera, handleZoom) {
    document
        .getElementById("forward")
        ?.addEventListener("click", () => queueMove("forward"));

    document
        .getElementById("backward")
        ?.addEventListener("click", () => queueMove("backward"));

    document
        .getElementById("left")
        ?.addEventListener("click", () => queueMove("left"));

    document
        .getElementById("right")
        ?.addEventListener("click", () => queueMove("right"));

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
    });

    window.addEventListener('touchmove', event => {
        if (isPinching && event.touches.length === 2) {
            const currentTouchDistance = getTouchDistance(event.touches);
            const zoomFactor = currentTouchDistance / initialTouchDistance;
            handleZoom(camera.zoom * zoomFactor);
            initialTouchDistance = currentTouchDistance;
        }
    });

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

        const to = {
            x: Math.round(intersect.x / tileSize),
            y: Math.round(intersect.y / tileSize),
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
