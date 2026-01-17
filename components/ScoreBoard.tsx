import React from 'react';
import { QuizState } from '../types';
import Button from './Button';

interface ScoreBoardProps {
  state: QuizState;
  onRestart: () => void;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ state, onRestart }) => {
  const percentage = Math.round((state.score / state.questions.length) * 100);
  
  let message = "Keep Watching!";
  if (percentage >= 80) message = "Otaku King! 👑";
  else if (percentage >= 50) message = "Casual Fan!";

  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-2xl max-w-lg w-full">
        <h2 className="text-3xl font-bold text-white mb-2">{message}</h2>
        <p className="text-gray-400 mb-8">Quiz Completed</p>

        <div className="mb-10 relative">
          <svg className="w-40 h-40 mx-auto" viewBox="0 0 36 36">
            <path
              className="text-gray-700"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="text-anime-accent"
              strokeDasharray={`${percentage}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span className="text-4xl font-bold text-white">{state.score}</span>
            <span className="text-gray-400 text-sm block">/ {state.questions.length}</span>
          </div>
        </div>

        <div className="space-y-4">
          <Button onClick={onRestart} fullWidth>
            Play Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;