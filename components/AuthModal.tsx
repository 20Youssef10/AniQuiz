import React, { useState } from 'react';
import Button from './Button';
import { loginWithGoogle, loginWithEmail, registerWithEmail } from '../services/firebase';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await loginWithGoogle();
      onLoginSuccess(user);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let user;
      if (isLogin) {
        user = await loginWithEmail(email, password);
      } else {
        if (!name) throw new Error("Name is required");
        user = await registerWithEmail(email, password, name);
      }
      onLoginSuccess(user);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel p-8 rounded-2xl max-w-sm w-full relative">
        <button onClick={onClose} aria-label="Close modal" className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
        
        <h2 className="text-2xl font-bold mb-6 text-center">{isLogin ? 'Welcome Back' : 'Join the Ranks'}</h2>
        
        <Button onClick={handleGoogle} fullWidth className="mb-4 bg-white text-black hover:bg-gray-200 !border-none flex items-center justify-center gap-2">
           <span className="text-lg">G</span> Continue with Google
        </Button>

        <div className="flex items-center gap-2 mb-4">
           <div className="h-px bg-white/10 flex-1"></div>
           <span className="text-xs text-gray-500 uppercase">OR</span>
           <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           {!isLogin && (
             <input type="text" placeholder="Ninja Name" aria-label="Ninja Name" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3" value={name} onChange={e => setName(e.target.value)} />
           )}
           <input type="email" placeholder="Email" aria-label="Email" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3" value={email} onChange={e => setEmail(e.target.value)} />
           <input type="password" placeholder="Password" aria-label="Password" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3" value={password} onChange={e => setPassword(e.target.value)} />
           
           {error && <p className="text-red-400 text-xs" role="alert" aria-live="polite">{error}</p>}
           
           <Button fullWidth disabled={loading}>
             {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
           </Button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-400">
          {isLogin ? "No account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-anime-primary hover:underline font-bold">
             {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;