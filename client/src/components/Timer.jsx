import React from 'react';

export const Timer = ({ formattedTime, isLowTime, isCriticalTime }) => {
  const getTimerClass = () => {
    if (isCriticalTime) return 'timer danger';
    if (isLowTime) return 'timer warning';
    return 'timer';
  };

  return (
    <div className={getTimerClass()}>
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <span>{formattedTime}</span>
    </div>
  );
};
export default Timer;
