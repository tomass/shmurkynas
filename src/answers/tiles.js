import { listenToPresses } from '../utilies/listenToPresses.js';

// The answer to a question of the kind 'tiles': the tiles of the question lay
// on a table, and the child puts some of them in a row, one after another. A
// tile pressed on the table goes to the end of the row, a tile pressed in the
// row goes back to the table. onAnswer is told what the row spells, once the
// child is happy with it.
export function TilesAnswer(question, onAnswer) {
  const answer = document.createElement('div');
  answer.className = 'answer-tiles';

  const row = document.createElement('div');
  row.className = 'tiles-row';
  answer.appendChild(row);

  const table = document.createElement('div');
  table.className = 'tiles-table';
  answer.appendChild(table);

  const buttons = document.createElement('div');
  buttons.className = 'dialog-buttons';
  const okButton = document.createElement('button');
  okButton.className = 'good-button';
  okButton.textContent = '✓';
  okButton.disabled = true;
  listenToPresses(okButton, () => {
    if (row.children.length > 0) {
      onAnswer([...row.children].map(tile => tile.textContent).join(''));
    }
  });
  buttons.appendChild(okButton);
  answer.appendChild(buttons);

  function tileButton(text) {
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.textContent = text;
    return tile;
  }

  // A tile taken from the table leaves a gap behind, so that the other tiles
  // stay where they were and a finger does not land on the wrong one. The
  // tile in the row is a copy, which gives the place on the table back when
  // it is pressed.
  question.tiles.forEach(text => {
    const onTable = tileButton(text);
    listenToPresses(onTable, () => {
      if (onTable.classList.contains('taken')) {
        return;
      }
      onTable.classList.add('taken');
      const inRow = tileButton(text);
      listenToPresses(inRow, () => {
        inRow.remove();
        onTable.classList.remove('taken');
        okButton.disabled = row.children.length === 0;
      });
      row.appendChild(inRow);
      okButton.disabled = false;
    });
    table.appendChild(onTable);
  });

  return answer;
}
