// Tears a finished treasure map image into pieces, the way a paper map would be
// torn by hand. The tearing is driven by a seed, so the very same pieces come
// out every time and nothing has to be stored except that seed.
import { createCanvas, loadImage } from 'canvas';

const step = 2.5;          // how often the tear line is sampled
const fibreSize = 2.2;     // the small ragged fibres of the paper
const edgeWidth = 7;       // how far the darkening of a torn edge reaches
const edgeStrength = 0.78; // how dark a torn edge gets
const attempts = 12;       // tries to find a tear that halves a piece nicely
const goodBalance = 0.7;   // a split this even is accepted at once

function seedFromText(text) {
  let hash = 2166136261;
  for (let i = 0; i < String(text).length; i++) {
    hash ^= String(text).charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A tear running right across the paper in some random direction. The tear
// wanders sideways as it goes, so it curves and can change its mind, but the
// wandering is held back and limited so that it never runs off the paper.
function tearPath(random, centreX, centreY, reach, maxOffset) {
  const direction = random() * Math.PI * 2;
  const alongX = Math.cos(direction), alongY = Math.sin(direction);
  const acrossX = -alongY, acrossY = alongX;

  const points = [];
  let drift = 0, offset = 0;

  for (let travelled = -reach; travelled <= reach; travelled += step) {
    drift += (random() - 0.5) * 1.7;
    drift *= 0.90;
    offset += drift;
    offset *= 0.985;
    if (offset > maxOffset) { offset = maxOffset; drift = 0; }
    if (offset < -maxOffset) { offset = -maxOffset; drift = 0; }

    const sideways = offset + (random() - 0.5) * fibreSize;
    points.push({
      x: centreX + alongX * travelled + acrossX * sideways,
      y: centreY + alongY * travelled + acrossY * sideways
    });
  }

  return { points, acrossX, acrossY, reach };
}

// Everything on one side of a tear, as a mask of 0/1 for every pixel.
function sideOfTear(tear, width, height) {
  const context = createCanvas(width, height).getContext('2d');
  const { points, acrossX, acrossY, reach } = tear;
  const far = reach * 3;

  context.fillStyle = '#fff';
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.forEach(point => context.lineTo(point.x, point.y));
  // Close the shape far outside the paper, so the fill covers one whole side.
  const last = points[points.length - 1];
  context.lineTo(last.x + acrossX * far, last.y + acrossY * far);
  context.lineTo(points[0].x + acrossX * far, points[0].y + acrossY * far);
  context.closePath();
  context.fill();

  const data = context.getImageData(0, 0, width, height).data;
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; p < mask.length; i += 4, p++) {
    mask[p] = data[i + 3] > 127 ? 1 : 0;
  }
  return mask;
}

function maskBounds(mask, width, height) {
  let minX = width, maxX = -1, minY = height, maxY = -1, count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY, count };
}

// The middle of a piece by weight. For a torn scrap this is a much better
// aiming point than the middle of its bounding box, which can even fall outside.
function maskCentroid(mask, width, height) {
  let sumX = 0, sumY = 0, count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      sumX += x;
      sumY += y;
      count++;
    }
  }
  return count ? { x: sumX / count, y: sumY / count, count } : null;
}

// Tears one piece in two through its middle. A tear that would leave a useless
// sliver is thrown away and tried again, so the pieces stay of similar size.
function tearInTwo(mask, width, height, random) {
  const centre = maskCentroid(mask, width, height);
  const reach = Math.hypot(width, height);
  // How far the tear may wander sideways, in step with the size of this piece.
  const maxOffset = Math.sqrt(centre.count) * 0.28;
  const wobble = Math.sqrt(centre.count) * 0.12;

  let best = null, bestBalance = -1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const tear = tearPath(
      random,
      centre.x + (random() - 0.5) * wobble,
      centre.y + (random() - 0.5) * wobble,
      reach,
      maxOffset
    );
    const side = sideOfTear(tear, width, height);

    const a = new Uint8Array(width * height), b = new Uint8Array(width * height);
    let countA = 0, countB = 0;
    for (let p = 0; p < mask.length; p++) {
      if (!mask[p]) continue;
      if (side[p]) { a[p] = 1; countA++; } else { b[p] = 1; countB++; }
    }

    // 1 means the halves came out equal, 0 means one of them got nothing.
    const balance = Math.min(countA, countB) / Math.max(countA, countB, 1);
    if (balance > bestBalance) {
      bestBalance = balance;
      best = [a, b];
    }
    if (balance > goodBalance) break;
  }
  return best;
}

// How far every pixel of a piece is from the torn edge. Pixels beyond the paper
// are not counted, so the original burnt border is left exactly as it was.
function distanceToEdge(mask, width, height) {
  const distance = new Float32Array(width * height).fill(9999);
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) distance[p] = 0;
  }

  const relax = (p, q, cost) => {
    if (distance[q] + cost < distance[p]) distance[p] = distance[q] + cost;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (x > 0) relax(p, p - 1, 1);
      if (y > 0) relax(p, p - width, 1);
      if (x > 0 && y > 0) relax(p, p - width - 1, 1.414);
      if (x < width - 1 && y > 0) relax(p, p - width + 1, 1.414);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const p = y * width + x;
      if (x < width - 1) relax(p, p + 1, 1);
      if (y < height - 1) relax(p, p + width, 1);
      if (x < width - 1 && y < height - 1) relax(p, p + width + 1, 1.414);
      if (x > 0 && y < height - 1) relax(p, p + width - 1, 1.414);
    }
  }
  return distance;
}

// Cuts one piece out of the whole picture, darkens its torn edges and trims it
// down to its own size, the way a real scrap of paper would be.
function renderPiece(source, mask, width, height) {
  const distance = distanceToEdge(mask, width, height);

  const whole = createCanvas(width, height);
  const image = whole.getContext('2d').createImageData(width, height);
  for (let p = 0; p < mask.length; p++) {
    const i = p * 4;
    if (!mask[p]) {
      image.data[i + 3] = 0;
      continue;
    }
    const d = distance[p];
    const shade = d < edgeWidth ? 1 - edgeStrength * (1 - d / edgeWidth) : 1;
    image.data[i] = source.data[i] * shade;
    image.data[i + 1] = source.data[i + 1] * shade;
    image.data[i + 2] = source.data[i + 2] * shade;
    image.data[i + 3] = 255;
  }
  whole.getContext('2d').putImageData(image, 0, 0);

  const bounds = maskBounds(mask, width, height);
  const pieceWidth = bounds.maxX - bounds.minX + 1;
  const pieceHeight = bounds.maxY - bounds.minY + 1;
  const piece = createCanvas(pieceWidth, pieceHeight);
  piece.getContext('2d').drawImage(
    whole, bounds.minX, bounds.minY, pieceWidth, pieceHeight, 0, 0, pieceWidth, pieceHeight
  );
  // The place on the whole sheet is kept, so that pieces found by one player
  // can be laid back together.
  return {
    image: piece.toDataURL('image/png'),
    x: bounds.minX,
    y: bounds.minY,
    width: pieceWidth,
    height: pieceHeight
  };
}

// Tears a map image into `pieceCount` pieces. The whole sheet is torn in two
// first, and then each half is torn on its own, so the later tears have nothing
// to do with each other and the pieces look hand torn.
// Always returns an array; for one piece it is the untouched picture.
async function tearImage(dataUrl, pieceCount, seedText) {
  const image = await loadImage(dataUrl);
  const width = image.width, height = image.height;

  if (pieceCount <= 1) {
    return {
      sheetWidth: width,
      sheetHeight: height,
      pieces: [{ image: dataUrl, x: 0, y: 0, width, height }]
    };
  }

  const whole = createCanvas(width, height);
  whole.getContext('2d').drawImage(image, 0, 0);
  const source = whole.getContext('2d').getImageData(0, 0, width, height);

  const random = makeRandom(seedFromText(seedText));

  let masks = tearInTwo(new Uint8Array(width * height).fill(1), width, height, random);
  if (pieceCount === 4) {
    masks = [
      ...tearInTwo(masks[0], width, height, random),
      ...tearInTwo(masks[1], width, height, random),
    ];
  }

  return {
    sheetWidth: width,
    sheetHeight: height,
    pieces: masks.map(mask => renderPiece(source, mask, width, height))
  };
}

export { tearImage };
