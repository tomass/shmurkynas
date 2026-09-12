// Development tool for checking how treasure map images look.
//
// Renders the parchment image that a player receives after picking up a treasure
// map and writes it to ./map.png, so it can be looked at without running the game.
// Otherwise one would have to start the server, connect a client, wait for an
// adventure to spawn and walk a player onto the treasure map tile just to see
// the picture.
//
// Worth running after touching mapGenerator.js or the map coordinate system:
// the image is drawn with the treasure in the middle, so the red X must always
// end up exactly in the center of the picture, on the tile which was asked for.
//
// Run from the project root (paths below are relative to it):
//   node tools/testMapImage.js
//
// This file is a tool only, it is not a part of the game and is not deployed.

import { parseMapData } from '../shared/mapParser.js';
import { promises as fs } from 'fs';
import { generateMapImage } from '../server/mapGenerator.js';

let maps;

async function loadMapData() {
    try {
        const mapText = await fs.readFile('./public/base.map', 'utf8');
        maps = parseMapData(mapText);
        console.log('Map data loaded successfully.');
        try {
          const imageDataUrl = await generateMapImage(maps['base'].tiles, 5, 5);
          const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, "");
          await fs.writeFile('./map.png', base64Data, 'base64');
          console.log(`Successfully generated treasure map image.`);
        } catch (error) {
          console.log('Error generating treasure map image:', error);
        }
    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

loadMapData();
