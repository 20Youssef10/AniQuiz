import React from 'react';

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Summoning Knowledge..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-anime-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute top-2 left-2 w-12 h-12 border-4 border-anime-accent border-b-transparent rounded-full animate-spin reverse-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      <p className="text-gray-300 font-medium animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingSpinner;