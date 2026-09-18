import React, { useState, useEffect } from 'react';
import { UserProfile, GachaCard, Language } from '../types';
import { fetchTopCharacters } from '../services/aniListService';
import { saveGachaItem } from '../services/firebase';
import Button from './Button';
import { playSound } from '../utils/sound';
import { Sparkles, Gift, X } from 'lucide-react';
import { t } from '../services/i18n';

interface GachaSystemProps {
  user: UserProfile;
  onClose: () => void;
  onCardPulled?: (card: GachaCard) => void;
  language?: Language;
}

const GachaSystem: React.FC<GachaSystemProps> = ({ user, onClose, onCardPulled, language = Language.ENGLISH }) => {
  const [loading, setLoading] = useState(false);
  const [pulledCard, setPulledCard] = useState<GachaCard | null>(null);
  const [canPull, setCanPull] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const isArabic = language === Language.ARABIC;

  useEffect(() => {
    checkEligibility();
    // Update timer every minute
    const intervalId = setInterval(() => {
      checkEligibility();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [user]);

  const checkEligibility = () => {
    if (!user.lastGachaDate) {
      setCanPull(true);
      return;
    }
    const now = Date.now();
    const diff = now - user.lastGachaDate;
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (diff > oneDay) {
      setCanPull(true);
    } else {
      setCanPull(false);
      const remaining = oneDay - diff;
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${mins}m`);
    }
  };

  const handlePull = async () => {
    setLoading(true);
    try {
      playSound('start'); // Summon sound
      
      // Fetch page 1-5 randomly to get top chars
      const page = Math.floor(Math.random() * 5) + 1;
      const chars = await fetchTopCharacters(page, 50);
      const randomChar = chars[Math.floor(Math.random() * chars.length)];

      const rarityRoll = Math.random();
      let rarity: GachaCard['rarity'] = 'Common';
      if (rarityRoll > 0.98) rarity = 'Legendary';
      else if (rarityRoll > 0.85) rarity = 'Epic';
      else if (rarityRoll > 0.6) rarity = 'Rare';

      const newCard: GachaCard = {
        id: randomChar.id,
        name: randomChar.name.full,
        image: randomChar.image.large,
        rarity,
        obtainedAt: Date.now()
      };

      // Simulate animation time
      setTimeout(async () => {
         await saveGachaItem(user.uid, newCard);
         setPulledCard(newCard);
         setCanPull(false);
         setLoading(false);
         if (onCardPulled) onCardPulled(newCard);
         playSound('correct');
      }, 2000);

    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const getRarityColor = (r: string) => {
    switch(r) {
      case 'Legendary': return 'border-yellow-400 shadow-yellow-500/50 text-yellow-400';
      case 'Epic': return 'border-purple-500 shadow-purple-500/50 text-purple-400';
      case 'Rare': return 'border-blue-400 shadow-blue-500/50 text-blue-400';
      default: return 'border-gray-400 text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md p-6 relative text-center">
        <button onClick={onClose} aria-label="Close gacha" className="absolute top-0 right-0 text-gray-400 hover:text-white p-2 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-anime-primary to-anime-accent mb-2">
          {t('dailySummon', language)}
        </h2>
        <p className="text-gray-400 mb-8">
          {isArabic ? "جرّب حظك وابنِ مجموعتك من أبطال الأنمي!" : "Test your luck and build your character collection!"}
        </p>

        {!pulledCard ? (
          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center min-h-[300px] justify-center transition-all">
             {loading ? (
                 <div className="flex flex-col items-center justify-center animate-fade-in">
                    <div className="relative">
                        <div className="w-32 h-32 border-4 border-anime-secondary/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
                        <div className="absolute inset-0 w-32 h-32 border-4 border-t-anime-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
                        </div>
                    </div>
                    <p className="mt-6 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-anime-primary to-anime-accent animate-pulse tracking-widest">
                        {isArabic ? "جاري فتح البوابة..." : "OPENING GATE..."}
                    </p>
                 </div>
             ) : (
                <>
                 <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center animate-bounce shadow-2xl shadow-pink-500/40 border border-white/20">
                   <Gift className="w-12 h-12 text-white" />
                 </div>
                 {canPull ? (
                   <Button onClick={handlePull} fullWidth className="!text-xl py-4 !bg-gradient-to-r from-pink-500 to-purple-600 shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform">
                     {isArabic ? "استدعاء x1" : "SUMMON x1"}
                   </Button>
                 ) : (
                   <div className="text-center">
                     <p className="text-gray-400 mb-2">{isArabic ? "الاستدعاء القادم متاح خلال:" : "Next summon available in:"}</p>
                     <div className="text-2xl font-mono font-bold text-white bg-black/20 px-4 py-2 rounded-lg border border-white/5">{timeLeft}</div>
                   </div>
                 )}
                </>
             )}
          </div>
        ) : (
          <div className="animate-fade-in-up">
             <div className={`bg-gray-900 rounded-xl overflow-hidden border-4 shadow-2xl relative group ${getRarityColor(pulledCard.rarity)}`}>
                <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-bold uppercase z-10">{pulledCard.rarity}</div>
                <img src={pulledCard.image} alt={pulledCard.name} className="w-full h-96 object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent p-4 pt-12">
                   <h3 className="text-2xl font-bold text-white">{pulledCard.name}</h3>
                </div>
             </div>
             <div className="mt-6 flex gap-4">
               <Button fullWidth onClick={onClose} variant="secondary">{t('close', language)}</Button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GachaSystem;
