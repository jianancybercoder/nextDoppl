import React, { useEffect, useState } from 'react';
import { AppStatus, GENERATION_PHASES } from '../types';
import { CheckCircle2, Loader2, Cpu } from 'lucide-react';

interface ProcessingOverlayProps {
  status: AppStatus;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ status }) => {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);

  useEffect(() => {
    if (status === AppStatus.IDLE || status === AppStatus.COMPLETE || status === AppStatus.ERROR) {
      setCurrentPhaseIndex(0);
      return;
    }

    const statusMap: Record<string, number> = {
      [AppStatus.ANALYZING]: 0,
      [AppStatus.WARPING]: 1,
      [AppStatus.COMPOSITING]: 2,
      [AppStatus.RENDERING]: 3,
    };
    
    if (status in statusMap) {
      setCurrentPhaseIndex(statusMap[status]);
    }
    
  }, [status]);

  if (status === AppStatus.IDLE || status === AppStatus.COMPLETE || status === AppStatus.ERROR) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sand/80 dark:bg-black/80 backdrop-blur-sm transition-colors duration-500">
      <div className="w-full max-w-md bg-paper dark:bg-charcoal border border-coffee/10 dark:border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden transition-colors duration-500">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_0%,rgba(99,102,241,0.1)_50%,transparent_100%)] animate-scan" style={{ backgroundSize: '100% 200%' }} />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-6 animate-pulse-slow">
            <Cpu className="w-8 h-8 text-accent" />
          </div>

          <h3 className="text-xl font-bold text-coffee dark:text-white mb-2 font-display tracking-tight">Doppl-Next 引擎</h3>
          <p className="text-coffee/60 dark:text-warm-text/60 text-sm mb-8">正在合成虛擬試穿效果...</p>

          <div className="w-full space-y-4">
            {GENERATION_PHASES.map((phase, index) => {
              const isActive = index === currentPhaseIndex;
              const isCompleted = index < currentPhaseIndex;

              return (
                <div 
                  key={phase.id} 
                  className={`
                    flex items-start gap-3 p-3 rounded-lg transition-all duration-500
                    ${isActive ? 'bg-coffee/5 dark:bg-white/5 border border-accent/30' : 'opacity-60'}
                  `}
                >
                  <div className="mt-1">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-coffee/20 dark:border-warm-text/20" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-sm font-medium ${isActive ? 'text-coffee dark:text-white' : 'text-coffee/50 dark:text-warm-text/50'}`}>
                      {phase.label}
                    </h4>
                    <p className={`text-xs mt-0.5 ${isActive ? 'text-accent' : 'text-coffee/40 dark:text-warm-text/40'}`}>
                      {phase.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingOverlay;