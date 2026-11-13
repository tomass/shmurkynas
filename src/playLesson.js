import { ChoiceAnswer } from './answers/choice.js';
import { TilesAnswer } from './answers/tiles.js';
import { listenToPresses } from './utilies/listenToPresses.js';

// One sitting of a lesson: its questions one after another, right or wrong
// said after each of them, and how it all went at the end.

// What a question is answered with, by the kind of the question.
const answers = { choice: ChoiceAnswer, tiles: TilesAnswer };

// Plays a lesson of the catalogue inside the given element of the page.
// onFinished is called when the child has seen how it went and wants back.
export function playLesson(container, lesson, onFinished) {
  const problems = lesson.game.makeProblems(lesson.grade);
  let round = 0;
  let rightAnswers = 0;

  showQuestion();

  // A part of what is shown: a box on the page which lines are put into.
  function part(className) {
    const el = document.createElement('div');
    el.className = className;
    container.appendChild(el);
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

  // Shows the question of this round and gives back the box for what goes
  // with it: the way to answer it, or whether the answer was right. The two
  // are kept in boxes of their own, so that on a screen which is wide and
  // low they can stand side by side, see style.css.
  function showProblem(isAnswered) {
    const question = problems[round].question;
    container.textContent = '';
    const questionPart = part('lesson-question');
    line(questionPart, 'lesson-progress', `${round + 1} iš ${problems.length}`);
    line(questionPart, 'lesson-text', question.text);
    line(questionPart, 'lesson-figure', question.figure);
    if (question.hint) {
      hintButton(questionPart, question.hint, isAnswered);
    }
    return part('lesson-answer');
  }

  function showQuestion() {
    const question = problems[round].question;
    showProblem(false).appendChild(answers[question.kind](question, answer));
  }

  // The child has answered: the question stays where it was, and the way to
  // answer it gives way to whether the answer was right.
  function answer(given) {
    const problem = problems[round];
    const isRight = lesson.game.isRight(problem, given);
    if (isRight) {
      rightAnswers++;
    }
    const answerPart = showProblem(true);
    line(answerPart, 'lesson-feedback', isRight ? '✅ Teisingai!' : `❌ Ne visai. ${problem.solution}`);
    onwardButton(answerPart, 'Toliau', next);
  }

  function next() {
    round++;
    if (round < problems.length) {
      showQuestion();
    } else {
      showResult();
    }
  }

  // A star for every right answer, an empty one for every wrong one.
  function showResult() {
    container.textContent = '';
    const result = part('lesson-result');
    line(result, 'lesson-text', 'Pamoka baigta!');
    line(result, 'lesson-stars', '⭐'.repeat(rightAnswers) + '☆'.repeat(problems.length - rightAnswers));
    line(result, 'lesson-text', `Teisingai: ${rightAnswers} iš ${problems.length}`);
    onwardButton(result, 'Gerai', onFinished);
  }
}
