import { listenToPresses } from '../utilies/listenToPresses.js';

// The answer to a question of the kind 'choice': a button for every option
// of the question, and the one which is pressed is the answer. onAnswer is
// told which option that was.
export function ChoiceAnswer(question, onAnswer) {
  const choice = document.createElement('div');
  choice.className = 'answer-choice';

  question.options.forEach(option => {
    const button = document.createElement('button');
    button.textContent = option;
    listenToPresses(button, () => onAnswer(option));
    choice.appendChild(button);
  });

  return choice;
}
