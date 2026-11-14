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

// How far the clock of this device is from the clock of the server. What a
// lesson pays depends on how long ago it last paid, and that time was written
// down by the server's clock, so it is the server's clock which has to be
// asked what time it is now. The clock of a tablet may well be hours off.
let clockOffset = 0;

export function setEducation(fromServer, serverTime) {
  if (fromServer && Number.isInteger(fromServer.grade) &&
      fromServer.lessons && typeof fromServer.lessons === 'object') {
    education = fromServer;
  }
  if (Number.isFinite(serverTime)) {
    clockOffset = serverTime - Date.now();
  }
}

// What time it is now by the clock of the server.
export function serverNow() {
  return Date.now() + clockOffset;
}

// The grade the player is in, whose lessons he is given.
export function myGrade() {
  return education.grade;
}

function doneWith(lessonId) {
  return Object.hasOwn(education.lessons, lessonId) ? education.lessons[lessonId] : null;
}

// How many sittings of a lesson have paid so far.
export function timesPassed(lessonId) {
  const done = doneWith(lessonId);
  return done && Number.isInteger(done.passed) ? done.passed : 0;
}

// When a sitting of a lesson last paid, as an ISO date; null when none has.
export function lastPaidOf(lessonId) {
  const done = doneWith(lessonId);
  return done && typeof done.lastPaid === 'string' ? done.lastPaid : null;
}
