// The lesson of Roman numerals. It has two kinds of problems: a Roman number
// is shown and the child picks the usual number it stands for, or a usual
// number is shown and the child puts it together out of Roman digits.
//
// A lesson is two things. makeProblems makes up the problems of one sitting:
// each of them has a question, which is all the child is shown, the answer,
// and the solution - the right answer said in words, shown after a wrong one.
// isRight tells whether what the child answered is that answer.

// The numbers of one sitting are picked one from each of these ranges, so
// that a sitting starts easy and gets harder. Only grade 5 has ranges so far.
const ranges = [[1, 10], [11, 20], [21, 40], [41, 70], [71, 100]];

// What every Roman digit is worth.
const digitValues = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

// The digits a number up to 100 can be made of. The tiles nobody needs, put
// among the needed ones to make the child think, are taken from these.
const digitsInUse = ['I', 'V', 'X', 'L', 'C'];
const spareTiles = 3;

const romanParts = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

// A number written the Roman way: the biggest part which still fits is
// written down and taken away, until nothing is left.
export function toRoman(number) {
  let left = number;
  let roman = '';
  for (const [value, part] of romanParts) {
    while (left >= value) {
      roman += part;
      left -= value;
    }
  }
  return roman;
}

function randomBetween(from, to) {
  return from + Math.floor(Math.random() * (to - from + 1));
}

function shuffled(things) {
  const mixed = [...things];
  for (let i = mixed.length - 1; i > 0; i--) {
    const j = randomBetween(0, i);
    [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
  }
  return mixed;
}

// Three wrong numbers to stand next to the right one. The first is the trap
// of Roman numbers - the digits simply added up, XIV read as 10 + 1 + 5 -
// when that is not the right answer itself; the others are numbers close by.
function wrongNumbers(number, roman) {
  const addedUp = [...roman].reduce((sum, digit) => sum + digitValues[digit], 0);
  const closeBy = shuffled([1, 2, 5, 10].flatMap(step => [number + step, number - step]));
  const wrong = [addedUp, ...closeBy].filter(other => other > 0 && other !== number);
  return [...new Set(wrong)].slice(0, 3);
}

// A Roman number is shown, the usual one is picked out of four.
function readingProblem(number) {
  const roman = toRoman(number);
  const options = [number, ...wrongNumbers(number, roman)].sort((a, b) => a - b);
  return {
    question: { kind: 'choice', text: 'Koks tai skaičius?', figure: roman, options },
    answer: number,
    solution: `${roman} = ${number}`,
  };
}

// A usual number is shown, the Roman one is put together out of tiles: all
// the digits it needs and a few it does not. The hint says what the digits
// laying on the table are worth.
function writingProblem(number) {
  const roman = toRoman(number);
  const spare = Array.from({ length: spareTiles }, () => digitsInUse[randomBetween(0, digitsInUse.length - 1)]);
  const tiles = shuffled([...roman, ...spare]);
  const hint = digitsInUse
    .filter(digit => tiles.includes(digit))
    .map(digit => `${digit} = ${digitValues[digit]}`)
    .join(',  ');
  return {
    question: { kind: 'tiles', text: 'Sudėk romėnišką skaičių', figure: String(number), tiles, hint },
    answer: roman,
    solution: `${number} = ${roman}`,
  };
}

// The two kinds of problems take turns, and which of them goes first is left
// to chance, so a sitting always has some of both.
function makeProblems(grade) {
  const firstIsReading = Math.random() < 0.5;
  return ranges.map(([from, to], index) => {
    const number = randomBetween(from, to);
    const isReading = (index % 2 === 0) === firstIsReading;
    return isReading ? readingProblem(number) : writingProblem(number);
  });
}

// A picked number comes as a number and a Roman one put together as text, so
// both are looked at as text.
function isRight(problem, given) {
  return String(given) === String(problem.answer);
}

export const romanNumerals = { makeProblems, isRight };
