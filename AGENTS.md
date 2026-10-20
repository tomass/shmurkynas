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
- In map file tiles are stored with 0,0 on the top as this is more natural to human,
  who is draing a map.
- When map tiles are loaded into the game, y axis is reversed, making 0,0 at bottom, so
  when loading we have to change game_y = map file height - 1 - map_file_y + origin_y.
- **Origin**: a map can be extended in any direction, which would move every tile
  inside the tile array and so change the place of everything the server remembers
  (coins, treasures, bought living spaces, players). To stop that, a map carries
  `origin_x` and `origin_y` - the place of its lower left tile in the world,
  0 when they are not written in the map file. Extending a map on the left or at
  the bottom only lowers the origin, so world coordinates never move; see the four
  rules the map editor follows in `shared/mapCoords.js`. World coordinates can be
  negative and the game speaks them everywhere: the only place the tile array is
  reached is through `toIndex`/`toWorld`/`tileAt` of `shared/mapCoords.js`.
- Path finder (easy star js) is using the tile array, so `findPath` moves the places
  it is asked about by the origin on the way in and the path it answers on the way out.
- Everything which lays on the ground is looked over when the server starts
  (`validateStoredPlaces`): coins and treasures which ended up in a tree, a house or
  the water are removed, uncollected treasure map pieces are moved elsewhere, and
  players are taken out of walls.

### **Setup file example**
- Setup file consists of multiple maps, all of which have such components:
- [map=base] where base is the name of the map
- section with map attributes, for example lines: type=public, origin_x=-10, origin_y=-6
- point coordinates (x, y of a point and map_x, map_y of a transfer point) are
  written down the way the map is drawn - counted from its left and from its top -
  the game turns them into world coordinates while loading
- [tiles] followed by a character matrix of tile type characters like ŽGMPV.
- [points] lists points in that map
- each point starts with a text "transfer:" for transfer points and "living:" for living points
- every living point carries an `id=` (for example id=base-flat-01), which never changes
  and is never reused: who bought that living space is remembered by this id in
  livingSpaces.json, so the owner keeps his home even when the house is drawn
  somewhere else. A living point without an id still works - it is then remembered
  by its place, the way it used to be - but the server warns about it on startup.
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
