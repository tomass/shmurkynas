// One sitting of a lesson, the way the server sees it. The server makes up
// the problems and keeps them to itself: the browser is only ever sent the
// question of the round being played, never its answer. So how many answers
// a child got right is counted here, where the child can not reach.
//
// The sitting is kept on the player for as long as it lasts. It is not
// written to any file: a sitting cut short by a restart of the server is
// simply over. What is written down is what the child has learned, see
// educationOf below.

import { freshness, lessonAward, lessons, startingGrade } from '../shared/lessons.js';
import { subjectOfDesk } from '../shared/subjects.js';
import { tileAt } from '../shared/mapCoords.js';

// What the server remembers about the learning of a player. It is kept on
// the player as `education` and is written to players.json together with
// the rest of him:
//
//   grade     the grade the child is in, whose lessons he is given
//   lessons   for every lesson he has passed, by the id the lesson has in
//             shared/lessons.js:
//               passed     how many of its sittings have paid
//               lastPaid   when the last of them did, as an ISO date
//
// A lesson is remembered by its id, so an id in the catalogue must never be
// renamed or given to another lesson: the children would lose, or be given,
// what they have done.

// Is this something education can be made of? A player saved by an older
// server has nothing of the kind, and a broken file must not break the game.
export function isValidEducation(education) {
  return Boolean(education) && typeof education === 'object'
    && Number.isInteger(education.grade)
    && Boolean(education.lessons) && typeof education.lessons === 'object'
    && !Array.isArray(education.lessons);
}

// The education of a player. One who has none yet is given the one every
// child starts with.
export function educationOf(player) {
  if (!isValidEducation(player.education)) {
    player.education = { grade: startingGrade, lessons: {} };
  }
  return player.education;
}

// When a sitting of this lesson last paid, as an ISO date; null when none
// ever has.
function lastPaidOf(player, lessonId) {
  const done = educationOf(player).lessons;
  const before = Object.hasOwn(done, lessonId) ? done[lessonId] : null;
  return before && typeof before.lastPaid === 'string' ? before.lastPaid : null;
}

// A sitting of this lesson has paid: one more time passed, and `now` is the
// last time it paid.
function rememberPassed(player, lessonId, now) {
  const done = educationOf(player).lessons;
  const before = Object.hasOwn(done, lessonId) ? done[lessonId] : null;
  const passed = before && Number.isInteger(before.passed) ? before.passed : 0;
  done[lessonId] = { passed: passed + 1, lastPaid: new Date(now).toISOString() };
}

// Is the player standing next to a desk this subject is studied at? This is
// the very same "next to" the browser uses before it shows the lessons of a
// desk: one tile away, corners included.
function isAtDesk(player, map, subjectId) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (subjectOfDesk(tileAt(map, player.x + dx, player.y + dy)) === subjectId) {
        return true;
      }
    }
  }
  return false;
}

// What the browser is told about the round to be played now.
function questionMessage(sitting) {
  return {
    type: 'lessonQuestion',
    lesson: sitting.lesson,
    round: sitting.round,
    rounds: sitting.problems.length,
    question: sitting.problems[sitting.round].question,
  };
}

// Something did not work out, said in words the child can read.
function failure(reason) {
  return { type: 'lessonFailed', reason };
}

// The player sits down to a lesson. `map` is the map he is walking on. Gives
// back the message to answer him with: the first question, or why there is
// not going to be a lesson.
export function startSitting(player, lessonId, map) {
  const lesson = Object.hasOwn(lessons, lessonId) ? lessons[lessonId] : null;
  if (!lesson || !lesson.game) {
    return failure('Tokios pamokos dar nėra.');
  }
  if (lesson.grade !== educationOf(player).grade) {
    return failure('Ši pamoka ne tavo klasei.');
  }
  if (!isAtDesk(player, map, lesson.subject)) {
    return failure('Prieik prie suolo.');
  }
  player.sitting = {
    lesson: lessonId,
    problems: lesson.game.makeProblems(lesson.grade),
    round: 0,
    rightAnswers: 0,
  };
  return questionMessage(player.sitting);
}

// The player answers the question of a round. Gives back the message to
// answer him with: whether he was right, and with it either the question of
// the next round or, after the last one, how the whole sitting went and the
// money it has earned. The money is only named here, paying it out is left
// to the server, which keeps the purse of every player; a sitting which pays
// is remembered in the education of the player right here. Gives back nothing
// at all for an answer to a round which is already over - that is only a
// button pressed twice.
export function answerSitting(player, round, given) {
  const sitting = player.sitting;
  if (!sitting) {
    return failure('Pamoka nutrūko. Pradėk iš naujo.');
  }
  if (round !== sitting.round) {
    return null;
  }

  const problem = sitting.problems[sitting.round];
  const isRight = lessons[sitting.lesson].game.isRight(problem, given);
  if (isRight) {
    sitting.rightAnswers++;
  }
  sitting.round++;

  const checked = { type: 'lessonChecked', isRight, solution: problem.solution };
  if (sitting.round < sitting.problems.length) {
    checked.next = questionMessage(sitting);
  } else {
    // What the sitting pays depends on how long the lesson has rested, so
    // that is looked at before this sitting is written down as its last pay.
    // The browser is told along with the money how rested the lesson was, so
    // that it can say why the money is more or less than the time before.
    const rounds = sitting.problems.length;
    const now = Date.now();
    const lastPaid = lastPaidOf(player, sitting.lesson);
    const award = lessonAward(lessons[sitting.lesson], sitting.rightAnswers, rounds, lastPaid, now);
    checked.result = {
      rightAnswers: sitting.rightAnswers,
      rounds,
      award,
      firstTime: lastPaid === null,
      freshness: freshness(lastPaid, now),
    };
    if (award > 0) {
      rememberPassed(player, sitting.lesson, now);
    }
    player.sitting = null;
  }
  return checked;
}

// The player has left, so whatever he was sitting at is over.
export function dropSitting(player) {
  player.sitting = null;
}
