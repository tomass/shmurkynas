// One sitting of a lesson, the way the server sees it. The server makes up
// the problems and keeps them to itself: the browser is only ever sent the
// question of the round being played, never its answer. So how many answers
// a child got right is counted here, where the child can not reach.
//
// The sitting is kept on the player for as long as it lasts. It is not
// written to any file: a sitting cut short by a restart of the server is
// simply over.

import { lessons, startingGrade } from '../shared/lessons.js';
import { subjectOfDesk } from '../shared/subjects.js';
import { tileAt } from '../shared/mapCoords.js';

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
  // Nobody has been moved up a grade yet, so everybody is in the first one.
  if (lesson.grade !== startingGrade) {
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
// the next round or, after the last one, how the whole sitting went. Gives
// back nothing at all for an answer to a round which is already over - that
// is only a button pressed twice.
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
    checked.result = { rightAnswers: sitting.rightAnswers, rounds: sitting.problems.length };
    player.sitting = null;
  }
  return checked;
}

// The player has left, so whatever he was sitting at is over.
export function dropSitting(player) {
  player.sitting = null;
}
