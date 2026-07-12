import React from 'react';

export const QuestionNav = ({ questions, currentIndex, answeredQuestionIds = [], onSelect }) => {
  return (
    <div className="question-nav">
      {questions.map((q, index) => {
        const isActive = index === currentIndex;
        const isAnswered = answeredQuestionIds.includes(q.id);

        let className = 'question-nav-item';
        if (isActive) className += ' active';
        else if (isAnswered) className += ' answered';

        return (
          <button
            key={q.id}
            className={className}
            onClick={() => onSelect(index)}
            title={`Go to Question ${index + 1}`}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
};
export default QuestionNav;
