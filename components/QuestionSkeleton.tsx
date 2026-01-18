import React from 'react';

const QuestionSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto relative z-10">
      <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        
        {/* Shimmer Effect Overlay */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-20 pointer-events-none"></div>

        {/* Meta Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-24 bg-white/10 rounded-full"></div>
          <div className="h-4 w-32 bg-white/10 rounded"></div>
        </div>

        {/* Question Text Area */}
        <div className="space-y-4 mb-8">
          <div className="h-6 w-full bg-white/10 rounded"></div>
          <div className="h-6 w-5/6 bg-white/10 rounded"></div>
          <div className="h-6 w-4/6 bg-white/10 rounded"></div>
        </div>

        {/* Options */}
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[60px] w-full bg-white/5 rounded-xl border border-white/5 flex items-center px-4 gap-4">
               <div className="w-8 h-8 rounded-full bg-white/10 shrink-0"></div>
               <div className="h-4 w-1/2 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>

        {/* Footer Area */}
        <div className="mt-8 flex justify-center">
            <div className="h-10 w-32 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
};

export default QuestionSkeleton;