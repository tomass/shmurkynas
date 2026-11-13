import { subjects } from '../shared/subjects.js';
import { lessonsFor, startingGrade } from '../shared/lessons.js';
import { playLesson, stopLesson } from './playLesson.js';
import { listenToPresses } from './utilies/listenToPresses.js';

// What a child sees after tapping a desk at school: the subject of that desk
// and the lessons which can be studied there, and then the lesson itself.

let dialog = null;
let titleEl = null;
let lessonsEl = null;
let lessonEl = null;
// The subject of the desk the dialog was opened at.
let shownSubject = null;

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
  lessonEl = document.getElementById('study-lesson');

  listenToPresses(document.getElementById('close-study'), closeStudyDialog);
}

// Closing the dialog in the middle of a lesson simply drops that lesson.
export function closeStudyDialog() {
  if (dialog) {
    dialog.style.display = 'none';
    stopLesson();
    lessonEl.textContent = '';
  }
}

// Shows the lessons of one subject - 'math', 'art' and so on.
export function showStudyDialog(subjectId) {
  if (!subjects[subjectId]) {
    return;
  }
  buildDialog();
  shownSubject = subjectId;
  showLessonList();
  dialog.style.display = 'block';
}

// The dialog shows one of two things: the list of lessons to choose from, or
// the lesson which has been chosen.
function showLessonList() {
  const subject = subjects[shownSubject];
  titleEl.textContent = `${subject.icon} ${subject.name}`;
  lessonEl.textContent = '';
  lessonEl.style.display = 'none';
  lessonsEl.style.display = '';
  // Nobody has been moved up a grade yet, so every child is in the one all
  // of them start in.
  listLessons(lessonsFor(shownSubject, startingGrade));
}

function startLesson(lesson) {
  titleEl.textContent = `${subjects[shownSubject].icon} ${lesson.name}`;
  lessonsEl.style.display = 'none';
  lessonEl.style.display = '';
  // When the lesson is over the child is back at the list, to pick another.
  playLesson(lessonEl, lesson, showLessonList);
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
    // A lesson which has no game yet is listed, but can not be pressed.
    button.disabled = !lesson.game;
    listenToPresses(button, () => startLesson(lesson));
    lessonsEl.appendChild(button);
  });
}
