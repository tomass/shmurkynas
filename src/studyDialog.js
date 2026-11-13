import { subjects } from '../shared/subjects.js';
import { lessonsFor, startingGrade } from '../shared/lessons.js';
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
  // Nobody has been moved up a grade yet, so every child is in the one all
  // of them start in.
  listLessons(lessonsFor(subjectId, startingGrade));

  dialog.style.display = 'block';
}

// Every lesson gets a button of its own, with what it pays written on it.
function listLessons(lessons) {
  lessonsEl.textContent = '';
  if (lessons.length === 0) {
    lessonsEl.textContent = 'Pamokų čia dar nėra.';
    return;
  }
  lessons.forEach(lesson => {
    const button = document.createElement('button');
    const name = document.createElement('span');
    const reward = document.createElement('span');
    name.textContent = lesson.name;
    reward.textContent = `€${lesson.reward}`;
    button.appendChild(name);
    button.appendChild(reward);
    // There is nothing behind a lesson yet, so its button can not be pressed.
    button.disabled = true;
    lessonsEl.appendChild(button);
  });
}
