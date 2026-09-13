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
  const [shakingOption, setShakingOption] = useState<string | null>(null);

  // Reset blur when question changes
  useEffect(() => {
    if (question.type === QuestionType.IMAGE_GUESS || question.type === QuestionType.OP_ED_GUESS || question.type === QuestionType.VOICE_ACTOR_GUESS) {
      setBlurAmount(20); // Start with heavy blur
    } else {
      setBlurAmount(0);
    }
    setShakingOption(null);
  }, [question]);

  // Gradually reduce blur over time (Only for Image and OP/ED)
  useEffect(() => {
    let interval: any;
    if ((question.type === QuestionType.IMAGE_GUESS || question.type === QuestionType.OP_ED_GUESS) && !isRevealed && blurAmount > 0) {
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
      if (option !== question.correctAnswer) {
        setShakingOption(option); // Trigger shake on wrong click locally for immediate feedback
      }
      playSound('click'); // Provide audio feedback
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
        if (option === question.correctAnswer) return '!bg-green-600 !border-green-400 !text-white ring-2 ring-green-400 ring-offset-2 ring-offset-transparent shadow-[0_0_15px_rgba(34,197,94,0.5)] transform scale-[1.02]';
        if (option === selectedAnswer) return '!bg-red-500/50 !border-red-500 !text-white';
        return 'opacity-50 grayscale';
     }
     return '';
  };

  const isWrong = (option: string) => isRevealed && option === selectedAnswer && option !== question.correctAnswer;

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up relative z-10">
      <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Decorator */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-anime-accent/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        
        {/* Question Meta */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold tracking-wider text-anime-accent uppercase bg-anime-accent/10 px-3 py-1 rounded-full border border-anime-accent/20">
            {question.type.replace(/_/g, ' ')}
          </span>
          {question.relatedAnimeTitle && (
             <span className="text-xs text-gray-400 truncate max-w-[150px] italic">
               {question.relatedAnimeTitle}
             </span>
          )}
        </div>

        {/* Question Content */}
        <div className="space-y-6 mb-8">
          
          {/* Image Guess Visual */}
          {question.type === QuestionType.IMAGE_GUESS && question.imageUrl && (
            <div className="flex justify-center flex-col items-center">
              <div className="relative w-full max-w-xs aspect-square md:aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 group">
                <img 
                  src={question.imageUrl} 
                  alt="Quiz Clue" 
                  className="w-full h-full object-cover object-top transition-all duration-1000 ease-out transform group-hover:scale-105"
                  style={{ filter: `blur(${blurAmount}px)` }}
                />
                {!isRevealed && blurAmount > 0 && (
                   <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white backdrop-blur-sm animate-pulse">
                     Revealing...
                   </div>
                )}
              </div>
            </div>
          )}

          {/* Emoji Guess Visual */}
          {question.type === QuestionType.EMOJI_GUESS && question.emojiClue && (
             <div className="flex justify-center items-center py-6 bg-white/5 rounded-xl border border-white/10 shadow-inner">
                <div className="text-6xl md:text-8xl tracking-widest animate-pop filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                   {question.emojiClue}
                </div>
             </div>
          )}

          {/* Voice Actor Guess Player */}
          {question.type === QuestionType.VOICE_ACTOR_GUESS && question.videoId && (
             <div className="flex justify-center flex-col items-center">
                <div className="relative w-full max-w-lg aspect-video rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black">
                   <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${question.videoId}?autoplay=1&controls=1&modestbranding=1&showinfo=0&rel=0`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{
                          filter: isRevealed ? 'none' : `blur(100px)`, // Always heavily blurred until revealed
                          pointerEvents: 'auto',
                          transition: 'filter 1s ease-out'
                      }}
                   ></iframe>

                   {!isRevealed && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                         <div className="bg-anime-primary/90 px-6 py-4 rounded-full text-white backdrop-blur-md animate-pulse border border-white/20 shadow-xl">
                            <span className="text-2xl mr-2">🎙️</span>
                            <span className="font-bold tracking-wider">WHO IS SPEAKING?</span>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          )}

          {/* OP/ED Video Player */}
          {question.type === QuestionType.OP_ED_GUESS && question.videoId && (
             <div className="flex justify-center flex-col items-center">
                <div className="relative w-full max-w-lg aspect-video rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black">
                   <iframe 
                      width="100%" 
                      height="100%" 
                      src={`https://www.youtube.com/embed/${question.videoId}?autoplay=1&controls=1&modestbranding=1&showinfo=0&rel=0`} 
                      title="YouTube video player" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                      style={{ 
                          filter: `blur(${blurAmount}px)`, 
                          pointerEvents: 'auto', // Allow interaction (play button)
                          transition: 'filter 1s ease-out'
                      }}
                   ></iframe>
                   {!isRevealed && blurAmount > 0 && (
                      <div className="absolute top-2 right-2 flex items-center justify-center pointer-events-none z-10">
                         <div className="bg-black/60 px-3 py-1 rounded text-xs text-white backdrop-blur-sm">
                            Listen closely...
                         </div>
                      </div>
                   )}
                </div>
             </div>
          )}
          
          <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed text-center md:text-left drop-shadow-md animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {question.text}
          </h2>
        </div>

        {/* Options */}
        <div className="grid gap-4">
          {question.options.map((option, idx) => (
            <Button
              key={`${question.id}-${idx}`}
              variant={getButtonVariant(option)}
              fullWidth
              onClick={() => handleOptionClick(option)}
              disabled={isRevealed}
              // Add stagger animation delay
              style={{ animationDelay: `${idx * 100 + 200}ms` }}
              className={`text-left justify-start h-auto min-h-[60px] animate-fade-in-up opacity-0 
                ${getButtonStyles(option)} 
                ${(shakingOption === option || isWrong(option)) ? 'animate-shake !bg-red-500/80 !border-red-500' : ''}
              `}
            >
              <div className="flex items-center w-full">
                <span className={`w-8 h-8 rounded-full bg-black/20 flex items-center justify-center mr-4 text-sm font-bold opacity-70 shrink-0 transition-colors ${selectedAnswer === option ? 'bg-white text-black opacity-100' : ''}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{option}</span>
                {isRevealed && option === question.correctAnswer && (
                  <span className="text-xl animate-pop">✅</span>
                )}
                {isRevealed && isWrong(option) && (
                  <span className="text-xl animate-pop">❌</span>
                )}
              </div>
            </Button>
          ))}
        </div>

        {/* Explanation Reveal */}
        {isRevealed && (
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
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