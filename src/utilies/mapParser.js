export function parseMapData(text) {
  const maps = {};
  const mapSections = text.split('[map=').slice(1);

  for (const section of mapSections) {
    const nameEnd = section.indexOf(']');
    const mapName = section.substring(0, nameEnd);
    const tilesStart = section.indexOf('[tiles]');
    const pointsStart = section.indexOf('[points]');

    if (tilesStart !== -1) {
      const tilesData = section.substring(tilesStart + '[tiles]'.length, pointsStart).trim();
      const tileArray = tilesData.split('\n').map(line => line.split(''));
      maps[mapName] = tileArray;
    }
  }

  return maps;
}