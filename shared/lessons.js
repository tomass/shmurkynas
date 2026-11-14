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

// How much of a sitting has to be answered right for it to pay at all: three
// questions out of five.
export const passingShare = 0.6;

// How much of its reward a lesson pays depends on how long it has rested
// since it last paid. Right after a sitting it pays a fifth of it, a day
// later the whole reward, and the longer it is left alone the more it pays,
// up to three times the reward after a week. Each point says: this many
// hours after the last pay, this share of the reward; between two points the
// share grows evenly. A lesson which has never paid pays the most of all, so
// that trying something new is worth it.
const freshnessCurve = [
  [0, 0.2],
  [24, 1],
  [7 * 24, 3],
];

const hour = 60 * 60 * 1000;

// However recently a lesson was done, a sitting which passes never pays less
// than this many euros.
export const minimumAward = 2;

// The share of its reward a lesson pays at the moment `now`, when it last paid
// at `lastPaid` - an ISO date, or nothing at all for a lesson never passed.
// Both clocks are the clock of the server.
export function freshness(lastPaid, now) {
  const most = freshnessCurve[freshnessCurve.length - 1][1];
  const paidAt = lastPaid ? Date.parse(lastPaid) : NaN;
  if (Number.isNaN(paidAt)) {
    return most;
  }
  const hours = Math.max(0, (now - paidAt) / hour);
  for (let i = 1; i < freshnessCurve.length; i++) {
    const [fromHours, fromShare] = freshnessCurve[i - 1];
    const [toHours, toShare] = freshnessCurve[i];
    if (hours <= toHours) {
      return fromShare + (toShare - fromShare) * (hours - fromHours) / (toHours - fromHours);
    }
  }
  return most;
}

// The money a sitting pays: nothing below the passing share, and above it the
// reward of the lesson, times its freshness, in the share of the questions
// answered right - three right out of five pays three fifths of it. Whole
// euros only, and never less than the minimum.
export function lessonAward(lesson, rightAnswers, rounds, lastPaid, now) {
  if (rounds <= 0 || rightAnswers < rounds * passingShare) {
    return 0;
  }
  const earned = Math.round(lesson.reward * freshness(lastPaid, now) * rightAnswers / rounds);
  return Math.max(minimumAward, earned);
}

// What a lesson pays at the moment `now` for a sitting with every answer
// right. This is what the list of lessons shows.
export function lessonPayNow(lesson, lastPaid, now) {
  return lessonAward(lesson, 1, 1, lastPaid, now);
}

// The lessons of one subject for one grade, in the order they are written
// above. Each of them is given back together with its id - the name it goes
// by in the list above.
export function lessonsFor(subjectId, grade) {
  return Object.entries(lessons)
    .filter(([, lesson]) => lesson.subject === subjectId && lesson.grade === grade)
    .map(([id, lesson]) => ({ id, ...lesson }));
}
