export function parseMapData(text) {
  const maps = {};
  const mapSections = text.split('[map=').slice(1);

  for (const section of mapSections) {
    const nameEnd = section.indexOf(']');
    const mapName = section.substring(0, nameEnd);
    const tilesStart = section.indexOf('[tiles]');
    const pointsStart = section.indexOf('[points]');

    let tilesData;
    if (pointsStart !== -1) {
      tilesData = section.substring(tilesStart + "[tiles]".length, pointsStart).trim();
    } else {
      tilesData = section.substring(tilesStart + "[tiles]".length).trim();
    }
    const tileArray = tilesData.split('\n').map(line => line.split(''));

    const points = [];
    if (pointsStart !== -1) {
      const pointsData = section.substring(pointsStart + "[points]".length).trim();
      if (pointsData) {
        const pointEntries = pointsData.split(/(transfer:|living:)/).slice(1);

        for (let i = 0; i < pointEntries.length; i += 2) {
          const type = pointEntries[i].replace(':', '').trim();

          const attributes = pointEntries[i + 1].trim().split('\n');
          const point = { type };
          attributes.forEach(attr => {
            const [key, value] = attr.split('=');
            if (key) {
              const trimmedValue = value ? value.trim() : '';
              point[key.trim()] = isNaN(trimmedValue) || trimmedValue === '' ? trimmedValue : Number(trimmedValue);
            }
          });
          points.push(point);
        }
      }
    }

    maps[mapName] = {
      tiles: tileArray,
      points: points
    };
  }

  return maps;
}