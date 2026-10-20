export function parseMapData(text) {
  const maps = {};
  const mapSections = text.split('[map=').slice(1);

  for (const section of mapSections) {
    const nameEnd = section.indexOf(']');
    const mapName = section.substring(0, nameEnd);
    const content = section.substring(nameEnd + 1);

    const typeMatch = content.match(/type=(public|private)/);
    const mapType = typeMatch ? typeMatch[1] : 'public';

    const tilesStart = content.indexOf('[tiles]');
    const pointsStart = content.indexOf('[points]');

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
              if (key == 'y') {
                // transform y to the way threejs coordinates work
                trimmedValue = tileArray.length - 1 - Number(trimmedValue);
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
      tiles: tileArray,
      points: points
    };
  }

  return maps;
}