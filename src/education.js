import { startingGrade } from '../shared/lessons.js';

// What the server remembers about the learning of this player: the grade he
// is in and, for every lesson he has passed, how many times it has paid and
// when it last did. The server is the one who keeps it, see server/study.js;
// the browser is told at the start and after every sitting which pays, and
// only shows it.
//
// Until the server has said anything - or when an older server says nothing
// at all - the player is in the grade every child starts in.
let education = { grade: startingGrade, lessons: {} };

export function setEducation(fromServer) {
  if (fromServer && Number.isInteger(fromServer.grade) &&
      fromServer.lessons && typeof fromServer.lessons === 'object') {
    education = fromServer;
  }
}

// The grade the player is in, whose lessons he is given.
export function myGrade() {
  return education.grade;
}

// How many sittings of a lesson have paid so far.
export function timesPassed(lessonId) {
  const done = Object.hasOwn(education.lessons, lessonId) ? education.lessons[lessonId] : null;
  return done && Number.isInteger(done.passed) ? done.passed : 0;
}
