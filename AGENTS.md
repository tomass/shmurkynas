# AI Agent Guide for [Shmurkynas game]

## **1. Project Overview**
**Purpose**:
A multiplayer tile-based game for kids where players explore maps, complete tasks, and customize living spaces.
Tiles are square parts of maps identifiex by their position x,y. Earch tile is 42x42 threejs units in size.
Features:
- **Tile types**: Grass, roads, buildings, trees
- **Points**: Some points on a map are active, currently there qre:
  - *transfer tiles* - they teleport (switch) to other maps (started with transfer: in setup file)
  - *living tiles* - they are entrance to other maps, which can be purchased by players as their living space.
                     (started with living: in setup file)
- **Multiplayer**: Real-time player movement, shared world state, and living space customization.
- **Tech Stack**:
  - Vite for builing.
  - 3D is rendered using Three.js
  - Backend: WebSockets server helping to collect and distribute information about the game to all players.

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
│   ├── /components                   # Threejs components
│   │   ├── Building.js               # Building object
│   │   ├── Camera.js                 # Threejs camera object
│   │   ├── Player.js                 # Player character object
│   │   └── Renderer.js               # Threejs renderer object
│   ├── /utilities                    # Utility functions
│   │   ├── calculateFinalPosition.js # Calculates player position after movement is performed
│   │   └── endUpInValidPosition.js   # Checks if player ends up in valid position after the move
│   └────── collectUserInput.js       # Controlling all user input and calling necessary actions
├── /server                           # Multiplayer backend
│   └── server.js                     # Websocket server code. Running on the backend.
├── constants.js                      # Different constants controlling game parameters
└── vite.config.js                    # Configuration to reach websocket server from dev environment

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
- section with map attributes, for example line: type=public
- [tiles] followed by a character matrix of tile type characters like ŽGMPV.
- [points] lists points in that map
- each point starts with a text "transfer:" for transfer points and "living:" for living points
- after point type all attributes are listed on a separate line, like.
- default map file in this format can be found in public/base.map

---

## **5. Development and Operations**
### **Development Commands**

To get started with the project, run the following commands:

- `npm install`: Install the necessary dependencies.
- `npm run dev`: Start the frontend development server.
- `npm run start:server`: Start the backend server.

### **Key Architectural Components**

- **Map Parsing**: Map data is parsed in `src/utilies/mapParser.js`.
- **User Input**: User input is handled in `src/collectUserInput.js`.
- **Map Rendering**: The map is rendered in `src/components/Map.js`.

### **Complex Interactions**

- **Camera Zoom**: When adjusting the camera zoom, you must update the camera's `zoom` property, call `updateProjectionMatrix()`, and update the shadow properties on the `DirectionalLight` to avoid visual bugs.
