import React from 'react';
import { UserProfile } from '../types';
import { ACHIEVEMENTS, calculateStatsFromXp } from '../services/levelService';
import Button from './Button';
import { X, Trophy, Scroll, Sparkles, Swords, Target, Shield, Zap, Glasses, Award } from 'lucide-react';

interface UserProfileViewProps {
  profile: UserProfile;
  onClose: () => void;
  onLogout: () => void;
}

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  first_blood: <Swords className="w-8 h-8 text-red-400" />,
  sharpshooter: <Target className="w-8 h-8 text-yellow-400" />,
  survivor: <Shield className="w-8 h-8 text-blue-400" />,
  speedster: <Zap className="w-8 h-8 text-amber-400" />,
  otaku: <Glasses className="w-8 h-8 text-purple-400" />,
  veteran: <Award className="w-8 h-8 text-emerald-400" />,
};

const UserProfileView: React.FC<UserProfileViewProps> = ({ profile, onClose, onLogout }) => {
  const stats = calculateStatsFromXp(profile.xp);
  
  // XP Progress
  const percentage = Math.min(100, (stats.xp / stats.nextLevelXp) * 100);

  return (
    <div className="fixed inset-0 z-[100] bg-anime-dark/95 backdrop-blur-md overflow-y-auto animate-fade-in">
       <div className="max-w-4xl mx-auto p-4 py-12">
          <button onClick={onClose} aria-label="Close profile" className="fixed top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full z-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
             <div className="w-32 h-32 rounded-full border-4 border-anime-primary overflow-hidden shadow-2xl relative">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-anime-primary to-anime-secondary flex items-center justify-center text-4xl font-bold">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
             </div>
             
             <div className="text-center md:text-left flex-1">
                <h2 className="text-4xl font-black text-white mb-2">{profile.displayName}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                   <span className="bg-anime-accent px-3 py-1 rounded-full text-xs font-bold uppercase">{stats.title}</span>
                   <span className="bg-white/10 px-3 py-1 rounded-full text-xs text-gray-300">Level {stats.level}</span>
                   <span className="bg-white/10 px-3 py-1 rounded-full text-xs text-gray-300">{profile.gamesPlayed} Matches</span>
                </div>
                
                {/* XP Bar */}
                <div
                   className="w-full max-w-md bg-black/40 h-4 rounded-full overflow-hidden border border-white/10 relative group"
                   role="progressbar"
                   aria-valuenow={stats.xp}
                   aria-valuemin={0}
                   aria-valuemax={stats.nextLevelXp}
                   aria-label="User XP Progress"
                >
                   <div className="h-full bg-gradient-to-r from-green-400 to-green-600" style={{ width: `${percentage}%` }}></div>
                   <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {stats.xp} / {stats.nextLevelXp} XP
                   </div>
                </div>
             </div>

             <Button variant="secondary" onClick={onLogout}>Sign Out</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
             {/* Achievements */}
             <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                   <Trophy className="w-6 h-6 text-yellow-400" />
                   <span>Achievements</span>
                </h3>
                <div className="grid grid-cols-3 gap-4">
                   {ACHIEVEMENTS.map(ach => {
                      const isUnlocked = profile.achievements.includes(ach.id);
                      return (
                         <div key={ach.id} className={`flex flex-col items-center text-center p-3 rounded-xl border ${isUnlocked ? 'bg-gradient-to-br from-white/10 to-white/5 border-anime-primary/50' : 'bg-black/20 border-white/5 opacity-50 grayscale'}`}>
                            <div className="mb-2">{ACHIEVEMENT_ICONS[ach.id] || <Award className="w-8 h-8 text-gray-400" />}</div>
                            <div className="text-xs font-bold mb-1">{ach.title}</div>
                            <div className="text-[10px] text-gray-400 leading-tight hidden md:block">{ach.description}</div>
                         </div>
                      );
                   })}
                </div>
             </div>

             {/* Match History */}
             <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                   <Scroll className="w-6 h-6 text-anime-secondary" />
                   <span>Recent History</span>
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                   {profile.matchHistory?.slice().reverse().slice(0, 10).map((match, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                         <div>
                            <div className="text-sm font-bold text-white">{match.mode} <span className="text-xs font-normal text-gray-500">({match.difficulty})</span></div>
                            <div className="text-xs text-gray-400">{new Date(match.date).toLocaleDateString()}</div>
                         </div>
                         <div className="text-right">
                            <div className="text-lg font-bold text-anime-primary">{match.score} <span className="text-xs text-gray-500">/ {match.totalQuestions}</span></div>
                            <div className="text-xs text-green-400">+{match.xpEarned} XP</div>
                         </div>
                      </div>
                   ))}
                   {(!profile.matchHistory || profile.matchHistory.length === 0) && (
                      <div className="text-center text-gray-500 py-8">No matches played yet.</div>
                   )}
                </div>
             </div>
          </div>

          {/* Card Collection */}
          <div className="glass-panel p-6 rounded-2xl">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                   <Sparkles className="w-6 h-6 text-pink-400" />
                   <span>Card Collection ({profile.inventory?.length || 0})</span>
                </h3>
                <span className="text-xs text-gray-400">Summoned via Daily Gacha</span>
             </div>

             {profile.inventory && profile.inventory.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                   {profile.inventory.map((card, idx) => {
                      const rarityClasses = {
                         Legendary: 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]',
                         Epic: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
                         Rare: 'border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]',
                         Common: 'border-gray-500'
                      }[card.rarity] || 'border-gray-500';

                      const rarityText = {
                         Legendary: 'text-yellow-400',
                         Epic: 'text-purple-400',
                         Rare: 'text-blue-400',
                         Common: 'text-gray-400'
                      }[card.rarity] || 'text-gray-400';

                      return (
                         <div key={`${card.id}-${idx}`} className={`glass-panel p-2 rounded-xl border-2 flex flex-col items-center text-center transition-transform hover:scale-105 ${rarityClasses}`}>
                            <div className="w-full aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-black/40">
                               <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="text-xs font-bold text-white truncate w-full" title={card.name}>{card.name}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${rarityText}`}>{card.rarity}</div>
                         </div>
                      );
                   })}
                </div>
             ) : (
                <div className="text-center py-8 text-gray-400">
                   <p className="text-sm mb-2">No cards in your collection yet.</p>
                   <p className="text-xs text-gray-500">Roll the Daily Summon to start collecting legendary anime characters!</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default UserProfileView;