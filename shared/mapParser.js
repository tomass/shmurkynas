export function parseMapData(text) {
  const maps = {};
  const mapSections = text.split('[map=').slice(1);

  for (const section of mapSections) {
    const nameEnd = section.indexOf(']');
    const mapName = section.substring(0, nameEnd);
    const content = section.substring(nameEnd + 1);

    const tilesStart = content.indexOf('[tiles]');
    const pointsStart = content.indexOf('[points]');
    // Everything the map says about itself is written before its tiles.
    const header = content.substring(0, tilesStart);

    const typeMatch = header.match(/type=(public|private)/);
    const mapType = typeMatch ? typeMatch[1] : 'public';

    // Where the lower left tile of this map stands in the world. A map which
    // has never been extended on the left or at the bottom has no origin
    // written in it, which means 0, 0. See shared/mapCoords.js.
    const origin = {
      x: readNumber(header, 'origin_x'),
      y: readNumber(header, 'origin_y')
    };

    let tilesData;
    if (pointsStart !== -1) {
      tilesData = content.substring(tilesStart + "[tiles]".length, pointsStart).trim();
    } else {
      tilesData = content.substring(tilesStart + "[tiles]".length).trim();
    }
    // Note: reversing the rows to match coordinate system - y=0 at bottom
    const tileArray = tilesData.split('\n').map(line => line.split('')).reverse();

    const points = [];
    if (pointsStart !== -1) {
      const pointsData = content.substring(pointsStart + "[points]".length).trim();
      if (pointsData) {
        const pointEntries = pointsData.split(/(transfer:|living:)/).slice(1);

        for (let i = 0; i < pointEntries.length; i += 2) {
          const type = pointEntries[i].replace(':', '').trim();

          const attributes = pointEntries[i + 1].trim().split('\n');
          const point = {};
          attributes.forEach(attr => {
            const [key, value] = attr.split('=');
            if (key) {
              let trimmedValue = value ? value.trim() : '';
              // The place of a point is written down the way the map is drawn:
              // counted from the left and from the top of this very file. Here
              // it is turned into the place in the world, which is what the
              // rest of the game and everything remembered in the files use.
              // map_x and map_y are left alone on purpose: they belong to the
              // map a transfer point leads to, so only that map can turn them
              // around, see switchToMap.
              if (key == 'x') {
                trimmedValue = Number(trimmedValue) + origin.x;
              }
              if (key == 'y') {
                trimmedValue = tileArray.length - 1 - Number(trimmedValue) + origin.y;
              }
              point[key.trim()] = isNaN(trimmedValue) || trimmedValue === '' ? trimmedValue : Number(trimmedValue);
            }
          });
          // Whether this is a transfer or a living point is told by the line
          // which starts it. A living point also has a type of its own - flat1,
          // house1 and so on - which would otherwise take the place of the kind
          // of the point, so it is kept under its own name.
          if (point.type !== undefined) {
            point.livingType = point.type;
          }
          point.type = type;
          points.push(point);
        }
      }
    }

    maps[mapName] = {
      type: mapType,
      origin: origin,
      tiles: tileArray,
      points: points
    };
  }

  return maps;
}

// A whole number written in the header of a map, 0 when it is not there.
function readNumber(header, name) {
  const match = header.match(new RegExp(`^\\s*${name}\\s*=\\s*(-?\\d+)\\s*$`, 'm'));
  return match ? Number(match[1]) : 0;
}
