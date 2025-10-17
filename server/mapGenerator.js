import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

async function generateMapImage(mapData, x, y, outputPath) {
  const tileSize = 24;
  const width = mapData[0].length * tileSize;
  const height = mapData.length * tileSize;

  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  // 1. Draw parchment background from local file
  try {
    const parchmentImage = await loadImage('./public/parchment.jpg');
    const pattern = context.createPattern(parchmentImage, 'repeat');
    context.fillStyle = pattern;
    context.fillRect(0, 0, width, height);
  } catch (error) {
    console.error('Failed to load parchment texture from file. Using fallback color.', error);
    context.fillStyle = '#D2B48C';
    context.fillRect(0, 0, width, height);
  }

  // 2. Draw map tiles with a hand-drawn style
  context.strokeStyle = '#4a4a4a';
  context.lineWidth = 1.5;

  // The server provides an inverted Y-coordinate for the treasure.
  // We must draw the map tiles consistently with that coordinate system.
  // The mapData's row 0 is the top of the map, but in the game's coordinate
  // system, it's the highest Y value.
  for (let row = 0; row < mapData.length; row++) {
    for (let col = 0; col < mapData[row].length; col++) {
      if (mapData[row][col] === 1) { // It's a wall
        context.fillStyle = '#6B4F3A';
        // We draw the tile data from the top (row 0) to the bottom.
        const rectX = col * tileSize;
        const rectY = row * tileSize;

        context.beginPath();
        context.moveTo(rectX + (Math.random() - 0.5) * 4, rectY + (Math.random() - 0.5) * 4);
        context.lineTo(rectX + tileSize + (Math.random() - 0.5) * 4, rectY + (Math.random() - 0.5) * 4);
        context.lineTo(rectX + tileSize + (Math.random() - 0.5) * 4, rectY + tileSize + (Math.random() - 0.5) * 4);
        context.lineTo(rectX + (Math.random() - 0.5) * 4, rectY + tileSize + (Math.random() - 0.5) * 4);
        context.closePath();
        context.fill();
        context.stroke();
      }
    }
  }

  // 3. Add burnt edges effect
  context.strokeStyle = 'rgba(0,0,0,0.5)';
  context.lineWidth = tileSize * 1.5;
  context.strokeRect(0, 0, width, height);
  context.strokeStyle = 'rgba(0,0,0,0.3)';
  context.lineWidth = tileSize * 0.8;
  context.strokeRect(0, 0, width, height);

  // 4. Draw a large red 'X' at the treasure location
  // The 'y' coordinate is pre-inverted by the server to match the canvas system.
  const treasureX = x * tileSize + tileSize / 2;
  const treasureY = y * tileSize + tileSize / 2;
  context.strokeStyle = '#D42D2D';
  context.lineWidth = 5;
  context.font = `${tileSize * 1.5}px 'Comic Sans MS', 'Chalkduster', 'fantasy'`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = "rgba(0,0,0,0.7)";
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  context.shadowBlur = 3;
  context.fillText('X', treasureX, treasureY);
  context.shadowColor = "rgba(0,0,0,0)";

  // Save the canvas to a file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Treasure map image saved to ${outputPath}`);
}

export { generateMapImage };