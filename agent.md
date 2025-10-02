# AI Agent Guide for [Shmurkynas game]

## **1. Project Overview**
**Purpose**:
A multiplayer tile-based game for kids where players explore maps, complete tasks, and customize living spaces.
Features:
- **Tile types**: Grass, roads, buildings, trees, *transfer tiles* (teleport to other maps), *living tiles* (purchasable homes).
- **Multiplayer**: Real-time player movement, shared world state, and living space customization.
- **Tech Stack**: Vite (frontend), Three.js (3D rendering), [Backend: WebSockets].

**Target Audience**:
Kids aged 6–12 (simple controls, bright visuals, collaborative tasks).

---

## **2. How AI Agents Can Help**
### **Common Tasks**
| Task Type    | Examples                                      | Notes                                  |
|--------------|-----------------------------------------------|----------------------------------------|
| **UI/UX**    | Improve mobile controls for tile selection.   | Uses `pointer-lock` for movement.      |

### **Out of Scope**
- **Never**: Hardcode API keys (use `.env` for Firebase/WS endpoints).

---

## **3. Repository Structure**
/
├── /public                 # Static assets
│   └── base.map            # Initial loaded game map
├── /src
│   ├── /components         # Threejs components
│   │   ├── Building.js     # Building object
│   │   ├── Camera.js       # Threejs camera object
│   │   ├── Player.js       # Player character object
│   │   └── Renderer.js     # Threejs renderer object
│   └── /utilities          # Utility functions
│       ├── calculateFinalPosition.js # Calculates player position after movement is performed
│       └── endUpInValidPosition.js # Checks if player ends up in valid position after the move
├── /server                 # Multiplayer backend
│   └── server.js           # Websocket server code. Running on the backend.
├── constants.js            # Different game constants
└── vite.config.js          # Configuration to reach websocket server from dev environment

**Key Files**:
- `base.map`: This is a main map setup file

---

## **4. Conventions & Gotchas**
### **Tile System**
- **Grid**: Chunked tiles (each tile = 42x42 unit in Three.js).
- **Tile Types** which are defined in main.js variable charColors:
  | Type     | Char in setup  | Notes                  |
  |----------|----------------|------------------------|
  | Grass    | `Ž`            | Default walkable tile. |
  | Road     | `G`            |                        |
  | Tree     | `M`            |                        |
  | Building | `P`            |                        |
  | Water    | `V`            |                        |

- **Coordinates**: `(x, y)` = tile grid position; `(x, 0, z)` in Three.js space.

### **Setup file example**
- Setup file consists of multiple maps, all of which have such components:
- [map=base] where base is the name of the map
- [tiles] followed by a character matrix of tile type characters like ŽGMPV.
- [points] lists points in that map
- each point starts with a text "transfer:" for transfer points and "living:" for living points
- after point type all attributes are listed on a separate line, like:
x=29
y=10
map=butas_mazas
owner=
price=0
maintenance=0
