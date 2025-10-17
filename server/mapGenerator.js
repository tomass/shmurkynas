import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

async function generateMapImage(mapData, x, y, outputPath) {
  const tileSize = 24;
  const width = mapData[0].length * tileSize;
  const height = mapData.length * tileSize;

  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  // 1. Draw parchment background
  try {
    const parchmentImage = await loadImage('./public/parchment.jpg');
    const pattern = context.createPattern(parchmentImage, 'repeat');
    context.fillStyle = pattern;
    context.fillRect(0, 0, width, height);
  } catch (error) {
    console.error('Failed to load parchment texture. Using fallback color.', error);
    context.fillStyle = '#D2B48C'; // Fallback parchment-like color
    context.fillRect(0, 0, width, height);
  }

  // 2. Draw map tiles
  for (let row = 0; row < mapData.length; row++) {
    for (let col = 0; col < mapData[row].length; col++) {
      const tileX = col * tileSize;
      const tileY = row * tileSize;

      switch (mapData[row][col]) {
        case 'P': // Building
          context.fillStyle = '#6E6E6E'; // Dark grey
          context.fillRect(tileX, tileY, tileSize, tileSize);
          break;
        case 'M': // Tree
          // Trunk
          context.fillStyle = '#8B4513'; // Brown
          context.fillRect(tileX + tileSize * 0.4, tileY + tileSize * 0.5, tileSize * 0.2, tileSize * 0.5);
          // Leaves
          context.fillStyle = '#228B22'; // Forest green
          context.beginPath();
          context.arc(tileX + tileSize / 2, tileY + tileSize * 0.4, tileSize * 0.4, 0, Math.PI * 2);
          context.fill();
          break;
        case 'G': // Road
        case 'R':
          context.fillStyle = '#BDBDBD'; // Light grey
          context.fillRect(tileX, tileY, tileSize, tileSize);
          break;
        case 'V': // Water
          context.fillStyle = '#1E90FF'; // Dodger blue
          context.fillRect(tileX, tileY, tileSize, tileSize);
          break;
        case 'Ž': // Grass - leave as parchment
        default:
          break;
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
  const treasureX = x * tileSize + tileSize / 2;
  const treasureY = y * tileSize + tileSize / 2;
  context.strokeStyle = '#D42D2D';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(treasureX - tileSize / 4, treasureY - tileSize / 4);
  context.lineTo(treasureX + tileSize / 4, treasureY + tileSize / 4);
  context.moveTo(treasureX + tileSize / 4, treasureY - tileSize / 4);
  context.lineTo(treasureX - tileSize / 4, treasureY + tileSize / 4);
  context.stroke();

  // Save the canvas to a file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Treasure map image saved to ${outputPath}`);
}

export { generateMapImage };