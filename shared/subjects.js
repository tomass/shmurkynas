// The subjects a child can study at school. The browser and the server both
// ask here, so that a new subject only has to be written down in one place.
//
// Every subject has a desk of its own, and a desk is a tile: a digit in the
// map file, 0 for the first subject, 1 for the next one and so on up to 9.
// The map editor paints the very same digits (tileTypes in its constants.js),
// so a subject added here needs a desk added there as well.
//
// The colour is the one the desk is painted with in the map editor, so that a
// desk looks the same to the one who draws the school and to the one who
// walks in it.
export const subjects = {
  math: { name: 'Matematika', icon: '📐', desk: '0', colour: 0x7b2fbf },
  art: { name: 'Dailė', icon: '🎨', desk: '1', colour: 0xff5fa2 },
};

// The tile characters of all the desks.
export const deskTiles = Object.values(subjects).map(subject => subject.desk);

// What is studied at a desk - 'math', 'art' and so on. Null when the tile is
// not a desk at all.
export function subjectOfDesk(tile) {
  const found = Object.entries(subjects).find(([, subject]) => subject.desk === tile);
  return found ? found[0] : null;
}
