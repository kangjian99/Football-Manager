import React, { useState, useEffect, useRef } from 'react';
import { Key, Lock, Info, ArrowRight, PauseCircle, Clock } from 'lucide-react';

interface ApiKeyScreenProps {
  onSaveApiKey: (key: string) => void;
  onSkip: () => void;
}

export const ApiKeyScreen: React.FC<ApiKeyScreenProps> = ({ onSaveApiKey, onSkip }) => {
  const [keyInput, setKeyInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(3);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto skip countdown timer
  useEffect(() => {
    if (isUserInteracting) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onSkip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isUserInteracting, onSkip]);

  const handleStartInteraction = () => {
    if (!isUserInteracting) {
      setIsUserInteracting(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim()) {
      onSaveApiKey(keyInput.trim());
    } else {
      onSkip();
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full animate-in zoom-in duration-300">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-500">
            <Key size={32} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-2">Welcome Manager</h1>
        <p className="text-gray-400 text-center mb-6">请输入您的 Google Gemini API 密钥，以激活球探助手和解说引擎</p>

        {/* Timer notification banner */}
        <div className={`p-3 rounded-lg text-sm mb-6 flex items-center justify-between border transition-all ${
          isUserInteracting 
            ? 'bg-gray-700/50 border-gray-600 text-gray-300' 
            : 'bg-amber-900/20 border-amber-700/50 text-amber-300 animate-pulse'
        }`}>
          <div className="flex items-center gap-2">
            {isUserInteracting ? (
              <>
                <PauseCircle size={18} className="text-blue-400 shrink-0" />
                <span>已暂停倒计时，请继续输入</span>
              </>
            ) : (
              <>
                <Clock size={18} className="text-amber-400 shrink-0" />
                <span>未填写将在 <strong className="text-white text-base font-mono">{timeLeft}</strong> 秒后自动跳过</span>
              </>
            )}
          </div>
          {!isUserInteracting && (
            <button 
              type="button" 
              onClick={onSkip}
              className="text-xs bg-amber-600/30 hover:bg-amber-600/50 px-2.5 py-1 rounded text-amber-200 transition-colors shrink-0 ml-2"
            >
              跳过
            </button>
          )}
        </div>

        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6 text-sm text-blue-200">
          <p className="flex gap-2">
            <Info className="shrink-0" size={18} /> 
            <span><strong>只想试玩？</strong>您可以直接跳过或输入任意字符串，无 AI 功能依然可完整体验游戏</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              id="apiKeyInput"
              type="password" 
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                handleStartInteraction();
              }}
              onFocus={handleStartInteraction}
              onSelect={handleStartInteraction}
              onKeyDown={handleStartInteraction}
              placeholder="Paste your API Key here" 
              className="w-full bg-gray-900 border border-gray-600 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onSkip}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-3 rounded-lg transition-colors text-sm"
            >
              跳过 (Demo)
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-900/30 text-sm flex items-center justify-center gap-1"
            >
              <span>进入程序</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Get an API key here</a>
        </p>
      </div>
    </div>
  );
};

export default ApiKeyScreen;
