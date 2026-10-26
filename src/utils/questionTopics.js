// =============================================
// QUESTION TOPIC LABELS
// Formats review topics with readable operation names and symbols.
// =============================================
const operationLabels = {
  '+': 'Addition',
  '-': 'Subtraction',
  '×': 'Multiplication',
  '÷': 'Division',
};

export function formatQuestionTopic(topic, operation) {
  const topicLabel = operationLabels[topic] || topic;
  const operationSymbol = operationLabels[operation]
    ? operation
    : operationLabels[topic] ? topic : '';

  if (!topicLabel && operationSymbol) {
    return `${operationLabels[operationSymbol]} ${operationSymbol}`;
  }
  if (!topicLabel) return 'Mathematics';
  if (!operationSymbol || topicLabel.endsWith(operationSymbol)) {
    return topicLabel;
  }
  return `${topicLabel} ${operationSymbol}`;
}
