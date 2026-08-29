// Question generator based on grade level
// Grade 4 → Easy, Grade 5 → Medium, Grade 6 → Hard

const operations = ['+', '-', '×', '÷'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gradeSevenQuestion(questionMode = 'practice') {
  const range = questionMode === 'practice' ? 18 : questionMode === 'test' ? 30 : 45;
  const generators = [
    () => {
      const a = randomInt(-range, range);
      const b = randomInt(-range, range);
      return { questionText: `${a} + (${b})`, answer: a + b, operation: '+', topic: 'Integers' };
    },
    () => {
      const denominator = randomInt(3, 8);
      const first = randomInt(1, denominator - 1);
      const second = randomInt(1, denominator - first);
      return { questionText: `${first}/${denominator} + ${second}/${denominator}`, answer: (first + second) / denominator, operation: '+', topic: 'Fractions' };
    },
    () => {
      const percent = [10, 20, 25, 50][randomInt(0, 3)];
      const amount = randomInt(2, 20) * 10;
      return { questionText: `${percent}% of ${amount}`, answer: amount * percent / 100, operation: '%', topic: 'Percentages' };
    },
    () => {
      const length = randomInt(4, questionMode === 'practice' ? 12 : 20);
      const width = randomInt(3, questionMode === 'practice' ? 9 : 15);
      return { questionText: `Area of a rectangle ${length} cm × ${width} cm`, answer: length * width, operation: 'area', topic: 'Geometry' };
    },
    () => {
      const x = randomInt(2, 15);
      const amount = randomInt(2, 9);
      return { questionText: `Solve: x + ${amount} = ${x + amount}`, answer: x, operation: 'equation', topic: 'Algebra' };
    },
    () => {
      const mean = randomInt(2, 9);
      const values = [mean - 1, mean, mean + 1];
      return { questionText: `Find the mean of ${values.join(', ')}`, answer: values.reduce((sum, value) => sum + value, 0) / 3, operation: 'mean', topic: 'Data Handling' };
    },
    () => {
      const hours = randomInt(2, 6);
      const distance = randomInt(3, 9) * hours;
      return { questionText: `A car travels ${distance} km in ${hours} hours. How many km per hour?`, answer: distance / hours, operation: 'rate', topic: 'Word Problems' };
    },
  ];
  const question = generators[randomInt(0, generators.length - 1)]();
  return { ...question, answer: String(question.answer), difficulty: 'grade7' };
}

function gradeEightQuestion(questionMode = 'practice') {
  const maximum = questionMode === 'practice' ? 12 : questionMode === 'test' ? 20 : 30;
  const generators = [
    () => {
      const x = randomInt(2, maximum);
      const multiplier = randomInt(2, 5);
      const constant = randomInt(2, 10);
      return { questionText: `Solve: ${multiplier}x + ${constant} = ${multiplier * x + constant}`, answer: x, operation: 'equation', topic: 'Algebra' };
    },
    () => {
      const base = randomInt(2, maximum);
      const height = randomInt(2, maximum);
      return { questionText: `Area of a triangle with base ${base} cm and height ${height} cm`, answer: base * height / 2, operation: 'area', topic: 'Geometry' };
    },
    () => {
      const numerator = randomInt(1, 5);
      const denominator = randomInt(2, 5);
      const total = randomInt(2, 10) * denominator;
      return { questionText: `${numerator}/${denominator} of ${total}`, answer: numerator * total / denominator, operation: 'fraction', topic: 'Fractions' };
    },
    () => {
      const original = randomInt(4, 20) * 5;
      const percent = [10, 15, 20, 25][randomInt(0, 3)];
      return { questionText: `Increase ${original} by ${percent}%`, answer: original * (1 + percent / 100), operation: '%', topic: 'Percentages' };
    },
    () => {
      const first = randomInt(2, maximum);
      const second = randomInt(2, maximum);
      const third = randomInt(2, maximum);
      return { questionText: `Find the median of ${first}, ${second}, ${third}`, answer: [first, second, third].sort((a, b) => a - b)[1], operation: 'median', topic: 'Data Handling' };
    },
  ];
  const question = generators[randomInt(0, generators.length - 1)]();
  return { ...question, answer: String(question.answer), difficulty: 'grade8' };
}

function gradeNineQuestion(questionMode = 'practice') {
  const maximum = questionMode === 'practice' ? 12 : questionMode === 'test' ? 20 : 35;
  const generators = [
    () => {
      const x = randomInt(2, maximum);
      const coefficient = randomInt(2, 5);
      const constant = randomInt(2, 12);
      return { questionText: `Solve: ${coefficient}x - ${constant} = ${coefficient * x - constant}`, answer: x, operation: 'equation', topic: 'Algebra' };
    },
    () => {
      const a = randomInt(2, maximum);
      const b = randomInt(2, maximum);
      return { questionText: `Simplify: ${a}x + ${b}x. What is the coefficient of x?`, answer: a + b, operation: 'simplify', topic: 'Algebra' };
    },
    () => {
      const radius = randomInt(2, maximum);
      return { questionText: `Circumference of a circle with radius ${radius} cm (use π = 22/7)`, answer: 44 * radius / 7, operation: 'circumference', topic: 'Geometry' };
    },
    () => {
      const speed = randomInt(3, maximum);
      const time = randomInt(2, 6);
      return { questionText: `A cyclist travels at ${speed} km/h for ${time} hours. How far?`, answer: speed * time, operation: 'rate', topic: 'Word Problems' };
    },
    () => {
      const values = [randomInt(2, maximum), randomInt(2, maximum), randomInt(2, maximum), randomInt(2, maximum)];
      return { questionText: `Find the range of ${values.join(', ')}`, answer: Math.max(...values) - Math.min(...values), operation: 'range', topic: 'Data Handling' };
    },
  ];
  const question = generators[randomInt(0, generators.length - 1)]();
  return { ...question, answer: String(question.answer), difficulty: 'grade9' };
}

function generateQuestion(difficulty = 'easy', questionMode = 'practice') {
  if (difficulty === 'grade7') return gradeSevenQuestion(questionMode);
  if (difficulty === 'grade8') return gradeEightQuestion(questionMode);
  if (difficulty === 'grade9') return gradeNineQuestion(questionMode);

  let a, b, op, answer, questionText;

  const ops = difficulty === 'easy'
    ? ['+', '-', '×', '÷']
    : difficulty === 'medium'
      ? ['+', '-', '×', '÷']
      : operations;

  op = ops[randomInt(0, ops.length - 1)];

  switch (difficulty) {
    case 'easy':
      a = randomInt(1, 20);
      b = randomInt(1, 20);
      break;
    case 'medium':
      a = randomInt(1, 50);
      b = randomInt(1, 12);
      break;
    case 'hard':
      a = randomInt(1, 100);
      b = randomInt(1, 12);
      break;
    default:
      a = randomInt(1, 20);
      b = randomInt(1, 20);
  }

  switch (op) {
    case '+':
      answer = a + b;
      questionText = `${a} + ${b}`;
      break;
    case '-':
      // Ensure non-negative result
      if (a < b) [a, b] = [b, a];
      answer = a - b;
      questionText = `${a} - ${b}`;
      break;
    case '×':
      answer = a * b;
      questionText = `${a} × ${b}`;
      break;
    case '÷':
      // Ensure clean division
      answer = b;
      a = b * randomInt(1, 12);
      questionText = `${a} ÷ ${b}`;
      break;
    default:
      answer = a + b;
      questionText = `${a} + ${b}`;
  }

  return {
    questionText,
    answer: String(answer),
    operation: op,
    difficulty,
  };
}

export function generateQuestionSet(difficulty = 'easy', count = 10, questionMode = 'practice') {
  return Array.from({ length: count }, (_, i) => ({
    id: `q_${Date.now()}_${i}`,
    ...generateQuestion(difficulty, questionMode),
    questionMode,
  }));
}

export function difficultyFromGrade(grade) {
  if (grade <= 4) return 'easy';
  if (grade === 5) return 'medium';
  if (grade === 7) return 'grade7';
  if (grade === 8) return 'grade8';
  if (grade === 9) return 'grade9';
  return 'hard';
}

export { generateQuestion };
