// Shows how a treasure map looks torn into pieces, and how the pieces look laid
// back together when a player has found only some of them. Uses the very same
// tearing the game does, so what is drawn here is what players will see.
//
// Run from the project root:  node tools/tearDemo.js
//
// This file is a tool only, it is not a part of the game and is not deployed.
import { createCanvas, loadImage } from 'canvas';
import { promises as fs } from 'fs';
import { parseMapData } from '../shared/mapParser.js';
import { generateMapImage } from '../server/mapGenerator.js';
import { tearImage } from '../server/tearMap.js';

const TREASURE = { x: 16, y: 12 };
const SEEDS = ['g1ohw0vx', 'ruhirnsw', 't8f4izoa'];

const save = (canvas, name) =>
  fs.writeFile(name, canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''), 'base64');

// Draws the given pieces back onto one sheet, exactly as the game does when a
// player opens the map viewer.
async function combine(torn, indexes) {
  const canvas = createCanvas(torn.sheetWidth, torn.sheetHeight);
  const context = canvas.getContext('2d');
  for (const i of indexes) {
    const piece = torn.pieces[i];
    context.drawImage(await loadImage(piece.image), piece.x, piece.y);
  }
  return canvas;
}

async function main() {
  const maps = parseMapData(await fs.readFile('./public/base.map', 'utf8'));
  const whole = await generateMapImage(maps['base'].tiles, TREASURE.x, TREASURE.y);
  const original = await loadImage(whole);
  const W = original.width, H = original.height;
  const gap = 30, margin = 24;

  // Sheet 1: the same map torn by three different adventure ids.
  const sheet = createCanvas(margin * 2 + (W + gap) * (SEEDS.length + 1), H + 60);
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.fillStyle = '#8f8';
  ctx.font = '13px sans-serif';
  ctx.fillText('whole map', margin, 20);
  ctx.drawImage(original, margin, 30);

  let firstTorn = null;
  for (let s = 0; s < SEEDS.length; s++) {
    const torn = await tearImage(whole, 4, SEEDS[s]);
    if (!firstTorn) firstTorn = torn;
    const baseX = margin + (W + gap) * (s + 1);
    ctx.fillText(`torn, seed "${SEEDS[s]}"`, baseX, 20);
    for (const piece of torn.pieces) {
      // Pull the pieces apart a little from the middle, so the tears show.
      const dx = (piece.x + piece.width / 2 - W / 2) / (W / 2) * 15;
      const dy = (piece.y + piece.height / 2 - H / 2) / (H / 2) * 15;
      ctx.drawImage(await loadImage(piece.image), baseX + piece.x + dx, 30 + piece.y + dy);
    }
    console.log(`seed ${SEEDS[s]}:`, torn.pieces.map(p => `${p.width}x${p.height}@${p.x},${p.y}`).join('  '));
  }
  await save(sheet, './torn.png');

  // Sheet 2: how many pieces a player has, and what they then see.
  const views = [[0], [0, 1], [0, 1, 2], [0, 1, 2, 3]];
  const strip = createCanvas(margin * 2 + (W + gap) * views.length, H + 60);
  const sctx = strip.getContext('2d');
  sctx.fillStyle = '#1b1b1b';
  sctx.fillRect(0, 0, strip.width, strip.height);
  sctx.fillStyle = '#8f8';
  sctx.font = '13px sans-serif';
  for (let v = 0; v < views.length; v++) {
    const x = margin + (W + gap) * v;
    sctx.fillText(`${views[v].length} of 4 pieces found`, x, 20);
    sctx.drawImage(await combine(firstTorn, views[v]), x, 30);
  }
  await save(strip, './torn_combined.png');

  console.log('wrote torn.png and torn_combined.png');
}

main();
