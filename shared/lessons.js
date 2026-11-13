// The lessons a child can study at school. The browser and the server both
// ask here, so that a new lesson only has to be written down in one place.
//
// Every lesson belongs to a subject, which decides the desk it is studied at
// (see subjects.js), and to a grade: a child is only shown the lessons of the
// grade he is in. The reward is what a well solved lesson pays, in euros.
//
// The game of a lesson is what makes up its problems and checks the answers,
// each one is written in a file of its own in the lessons folder. A lesson
// without a game is only a promise: it is listed, but can not be studied yet.
import { romanNumerals } from './lessons/romanNumerals.js';

export const lessons = {
  romanNumerals: { subject: 'math', grade: 5, name: 'Romėniški skaičiai', reward: 5, game: romanNumerals },
  motion: { subject: 'math', grade: 5, name: 'Judėjimo uždaviniai', reward: 5 },
  colours: { subject: 'art', grade: 5, name: 'Spalvos', reward: 5 },
  composition: { subject: 'art', grade: 5, name: 'Kompozicija', reward: 5 },
};

// The grade every child starts in.
export const startingGrade = 5;

// The lessons of one subject for one grade, in the order they are written
// above. Each of them is given back together with its id - the name it goes
// by in the list above.
export function lessonsFor(subjectId, grade) {
  return Object.entries(lessons)
    .filter(([, lesson]) => lesson.subject === subjectId && lesson.grade === grade)
    .map(([id, lesson]) => ({ id, ...lesson }));
}
