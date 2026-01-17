import React, { useState, useEffect } from 'react';
import { QuizQuestion, QuestionType } from '../types';
import Button from './Button';
import { playSound } from '../utils/sound';

interface QuestionCardProps {
  question: QuizQuestion;
  selectedAnswer?: string;
  onAnswer: (answer: string) => void;
  isRevealed: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, selectedAnswer, onAnswer, isRevealed }) => {
  const [blurAmount, setBlurAmount] = useState(0);

  // Reset blur when question changes
  useEffect(() => {
    if (question.type === QuestionType.IMAGE_GUESS) {
      setBlurAmount(20); // Start with heavy blur
    } else {
      setBlurAmount(0);
    }
  }, [question]);

  // Gradually reduce blur over time
  useEffect(() => {
    let interval: any;
    if (question.type === QuestionType.IMAGE_GUESS && !isRevealed && blurAmount > 0) {
      interval = setInterval(() => {
        setBlurAmount(prev => Math.max(0, prev - 1)); // Reduce blur by 1px every 500ms
      }, 500);
    } else if (isRevealed) {
      setBlurAmount(0); // Clear immediately on reveal
    }
    return () => clearInterval(interval);
  }, [question.type, isRevealed, blurAmount]);

  const handleOptionClick = (option: string) => {
    if (!isRevealed) {
      playSound('click');
      onAnswer(option);
    }
  };

  const getButtonVariant = (option: string) => {
    if (!isRevealed) {
      return selectedAnswer === option ? 'primary' : 'secondary';
    }
    if (option === question.correctAnswer) return 'primary'; 
    if (option === selectedAnswer && option !== question.correctAnswer) return 'secondary'; 
    return 'secondary';
  };

  const getButtonStyles = (option: string) => {
     if (isRevealed) {
        if (option === question.correctAnswer) return '!bg-green-600 !border-green-400 !text-white ring-2 ring-green-400 ring-offset-2 ring-offset-transparent';
        if (option === selectedAnswer) return '!bg-red-500/50 !border-red-500 !text-white';
        return 'opacity-50';
     }
     return '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in relative z-10">
      <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        
        {/* Decorator */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-anime-accent/20 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Question Meta */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold tracking-wider text-anime-accent uppercase bg-anime-accent/10 px-3 py-1 rounded-full">
            {question.type.replace(/_/g, ' ')}
          </span>
          {question.relatedAnimeTitle && (
             <span className="text-xs text-gray-400 truncate max-w-[150px]">
               {question.relatedAnimeTitle}
             </span>
          )}
        </div>

        {/* Question Content */}
        <div className="space-y-6 mb-8">
          {question.imageUrl && (
            <div className="flex justify-center flex-col items-center">
              <div className="relative w-full max-w-xs aspect-square md:aspect-video rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/50">
                <img 
                  src={question.imageUrl} 
                  alt="Quiz Clue" 
                  className="w-full h-full object-cover transition-all duration-1000 ease-out"
                  style={{ filter: `blur(${blurAmount}px)` }}
                />
                {!isRevealed && blurAmount > 0 && (
                   <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white backdrop-blur-sm">
                     Revealing...
                   </div>
                )}
              </div>
            </div>
          )}
          
          <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed text-center md:text-left drop-shadow-md">
            {question.text}
          </h2>
        </div>

        {/* Options */}
        <div className="grid gap-4">
          {question.options.map((option, idx) => (
            <Button
              key={idx}
              variant={getButtonVariant(option)}
              fullWidth
              onClick={() => handleOptionClick(option)}
              disabled={isRevealed}
              className={`text-left justify-start h-auto min-h-[60px] ${getButtonStyles(option)}`}
            >
              <div className="flex items-center w-full">
                <span className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center mr-4 text-sm font-bold opacity-70 shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{option}</span>
              </div>
            </Button>
          ))}
        </div>

        {/* Explanation Reveal */}
        {isRevealed && (
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10 animate-fade-in-up">
            <h4 className="font-bold text-green-400 mb-2 flex items-center gap-2">
              <span className="text-xl">💡</span> Answer
            </h4>
            <p className="text-sm text-gray-200 leading-relaxed">{question.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;