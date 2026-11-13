import { subjects } from '../shared/subjects.js';
import { listenToPresses } from './utilies/listenToPresses.js';

// What a child sees after tapping a desk at school: the subject of that desk
// and the lessons which can be studied there.

let dialog = null;
let titleEl = null;
let lessonsEl = null;

// The dialog is only put on the page when it is needed for the first time.
function buildDialog() {
  if (dialog) {
    return;
  }
  // All the dialogs of the game are put into this one container: a tap which
  // lands inside it is left to the dialog and does not send the player
  // walking, see collectUserInput.js.
  const container = document.getElementById('living-container');
  const template = document.getElementById('study-template');
  container.appendChild(template.content.cloneNode(true));

  dialog = document.getElementById('study-dialog');
  titleEl = document.getElementById('study-title');
  lessonsEl = document.getElementById('study-lessons');

  listenToPresses(document.getElementById('close-study'), closeStudyDialog);
}

export function closeStudyDialog() {
  if (dialog) {
    dialog.style.display = 'none';
  }
}

// Shows the lessons of one subject - 'math', 'art' and so on.
export function showStudyDialog(subjectId) {
  const subject = subjects[subjectId];
  if (!subject) {
    return;
  }
  buildDialog();

  titleEl.textContent = `${subject.icon} ${subject.name}`;
  // No lessons have been written yet, so there is nothing to list.
  lessonsEl.textContent = 'Pamokų čia dar nėra.';

  dialog.style.display = 'block';
}
