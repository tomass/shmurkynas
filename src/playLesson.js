import { ChoiceAnswer } from './answers/choice.js';
import { TilesAnswer } from './answers/tiles.js';
import { passingShare } from '../shared/lessons.js';
import { playVictorySound } from './sounds.js';
import { listenToPresses } from './utilies/listenToPresses.js';
import { sendMessage } from './websocket.js';

// One sitting of a lesson: its questions one after another, right or wrong
// said after each of them, and how it all went at the end.
//
// The browser only shows and asks. The questions are made up by the server,
// which also is the one to say whether an answer was right, see
// server/study.js. So a sitting is a talk with the server:
//
//   startLesson    ->  lessonQuestion   the question of the first round
//   answerLesson   ->  lessonChecked    right or wrong, and with it either
//                                       the next question or the result
//   either of them ->  lessonFailed     why there is no lesson after all

// What a question is answered with, by the kind of the question.
const answers = { choice: ChoiceAnswer, tiles: TilesAnswer };

// The sitting being played: where on the page it is shown, what to do once it
// is over, the question on the screen and whether it has been answered yet.
// Null while no lesson is being played.
let sitting = null;
// Waits for the server to answer what it was last asked.
let replyTimer = null;

// Plays a lesson of the catalogue inside the given element of the page.
// onFinished is called when the child has seen how it went and wants back.
export function playLesson(container, lesson, onFinished) {
  sitting = { container, onFinished, shown: null, isAnswered: false };
  showNote('Ruošiama pamoka...');
  ask({ type: 'startLesson', lesson: lesson.id });
}

// The lesson is dropped, for example because its dialog was closed. Whatever
// the server still says about it is not listened to any more.
export function stopLesson() {
  clearTimeout(replyTimer);
  sitting = null;
}

// Everything the server is asked about a lesson goes out through here. A
// server which says nothing at all - an old one which knows nothing about
// lessons, or a broken connection - must not leave the child waiting for ever.
function ask(message) {
  sendMessage(message);
  clearTimeout(replyTimer);
  replyTimer = setTimeout(() => {
    showTrouble('Serveris neatsako. Pabandyk dar kartą.');
  }, 5000);
}

// ------------------------------------------------------ what the server says

// Each of these is called by websocket.js when the server has spoken. An
// answer which comes when no lesson is being played is one to a lesson which
// was dropped in the meantime, and is let go.

export function lessonQuestion(message) {
  if (sitting) {
    clearTimeout(replyTimer);
    showQuestion(message);
  }
}

export function lessonChecked(message) {
  if (sitting) {
    clearTimeout(replyTimer);
    showVerdict(message);
  }
}

export function lessonFailed(message) {
  if (sitting) {
    clearTimeout(replyTimer);
    showTrouble(message.reason);
  }
}

// ------------------------------------------------------ what the child sees

// A part of what is shown: a box on the page which lines are put into.
function part(className) {
  const el = document.createElement('div');
  el.className = className;
  sitting.container.appendChild(el);
  return el;
}

function line(parent, className, text) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  parent.appendChild(el);
  return el;
}

// A single green button under everything else, the way on from here.
function onwardButton(parent, text, press) {
  const buttons = document.createElement('div');
  buttons.className = 'dialog-buttons';
  const button = document.createElement('button');
  button.className = 'good-button';
  button.textContent = text;
  listenToPresses(button, press);
  buttons.appendChild(button);
  parent.appendChild(buttons);
  // On a computer the Enter key then presses it, with no need for a mouse.
  button.focus();
}

// A question which comes with a hint gets a lightbulb to press. The hint
// is written in the very place of the lightbulb, so nothing else moves.
// Once the question is answered the hint is of no use any more, but its
// line stays, empty, for that same reason.
function hintButton(parent, hint, isAnswered) {
  const hintLine = line(parent, 'lesson-hint', '');
  if (isAnswered) {
    return;
  }
  const button = document.createElement('button');
  button.textContent = '💡 Užuomina';
  listenToPresses(button, () => {
    hintLine.textContent = hint;
  });
  hintLine.appendChild(button);
}

// Shows the question on the screen and gives back the box for what goes with
// it: the way to answer it, or whether the answer was right. The two are kept
// in boxes of their own, so that on a screen which is wide and low they can
// stand side by side, see style.css.
function showProblem() {
  const { round, rounds, question } = sitting.shown;
  sitting.container.textContent = '';
  const questionPart = part('lesson-question');
  line(questionPart, 'lesson-progress', `${round + 1} iš ${rounds}`);
  line(questionPart, 'lesson-text', question.text);
  line(questionPart, 'lesson-figure', question.figure);
  if (question.hint) {
    hintButton(questionPart, question.hint, sitting.isAnswered);
  }
  return part('lesson-answer');
}

// The server has sent a question: it is shown together with the way to
// answer it.
function showQuestion(message) {
  sitting.shown = message;
  sitting.isAnswered = false;
  const question = message.question;
  showProblem().appendChild(answers[question.kind](question, giveAnswer));
}

// The child has answered. The answer is sent to the server and the question
// is left as it is until the server has said whether that was right. Only the
// first answer counts, a button pressed twice is not a second answer.
function giveAnswer(given) {
  if (!sitting || sitting.isAnswered) {
    return;
  }
  sitting.isAnswered = true;
  ask({ type: 'answerLesson', round: sitting.shown.round, answer: given });
}

// The server has said whether the answer was right: the question stays where
// it was, and the way to answer it gives way to that. What comes after - the
// next question or the result - the server has sent along already, it is
// only shown once the child has had the time to read.
function showVerdict(message) {
  const answerPart = showProblem();
  line(answerPart, 'lesson-feedback', message.isRight ? '✅ Teisingai!' : `❌ Ne visai. ${message.solution}`);
  onwardButton(answerPart, 'Toliau', () => {
    if (message.next) {
      showQuestion(message.next);
    } else {
      showResult(message.result);
    }
  });
}

// A star for every right answer, an empty one for every wrong one, and the
// money the sitting has earned. The server has put that money into the purse
// already, here it is only celebrated.
function showResult(result) {
  sitting.container.textContent = '';
  const resultPart = part('lesson-result');
  line(resultPart, 'lesson-text', 'Pamoka baigta!');
  line(resultPart, 'lesson-stars', '⭐'.repeat(result.rightAnswers) + '☆'.repeat(result.rounds - result.rightAnswers));
  line(resultPart, 'lesson-text', `Teisingai: ${result.rightAnswers} iš ${result.rounds}`);
  if (result.award > 0) {
    showAward(resultPart, result.award);
    playVictorySound();
  } else {
    const needed = Math.ceil(result.rounds * passingShare);
    line(resultPart, 'lesson-no-award', `Kad gautum pinigų, reikia bent ${needed} teisingų atsakymų.`);
  }
  onwardButton(resultPart, 'Gerai', finish);
}

// The money earned, written big, with a few coins jumping out of it.
const flyingCoins = 6;

function showAward(parent, award) {
  const awardLine = line(parent, 'lesson-award', `+€${award}`);
  for (let i = 0; i < flyingCoins; i++) {
    const coin = document.createElement('span');
    coin.className = 'award-coin';
    // Each coin flies off a little to the side of its own, and a little
    // later than the one before it.
    coin.style.setProperty('--dx', `${(i - (flyingCoins - 1) / 2) * 18}px`);
    coin.style.animationDelay = `${i * 0.06}s`;
    awardLine.appendChild(coin);
  }
}

// A few words in the place of the lesson, while there is nothing else to show.
function showNote(text) {
  sitting.container.textContent = '';
  return line(part('lesson-result'), 'lesson-text', text);
}

// The lesson can not go on, and the child is told why.
function showTrouble(text) {
  if (!sitting) {
    return;
  }
  onwardButton(showNote(text).parentNode, 'Gerai', finish);
}

function finish() {
  const onFinished = sitting.onFinished;
  stopLesson();
  onFinished();
}
