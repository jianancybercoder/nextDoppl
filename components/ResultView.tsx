import React from 'react';
import { Download, Maximize2, X, ChevronDown, Activity, Wind, Scale, HandMetal, Sparkles, Zap } from 'lucide-react';
import { VTONResult } from '../types';

interface ResultViewProps {
  result: VTONResult;
  onClose: () => void;
}

// Helper component for Radar Chart
const RadarChart = ({ scores }: { scores: any }) => {
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const metrics = [
    { key: 'comfort', label: '舒適' },
    { key: 'breathability', label: '透氣' },
    { key: 'softness', label: '柔軟' },
    { key: 'elasticity', label: '彈性' },
    { key: 'heaviness', label: '份量' },
  ];

  const angleStep = (Math.PI * 2) / metrics.length;

  // Calculate polygon points based on scores
  const points = metrics.map((metric, i) => {
    const value = (scores[metric.key] || 5) / 10; // Normalize 1-10 to 0-1
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const r = value * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  // Calculate background grid (webs)
  const webs = [0.2, 0.4, 0.6, 0.8, 1].map((scale) => {
    return metrics.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = radius * scale;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  });

  // Calculate axis lines
  const axes = metrics.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x1: center, y1: center, x2: x, y2: y };
  });

  // Labels
  const labels = metrics.map((m, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 20;
    const x = center + labelRadius * Math.cos(angle);
    const y = center + labelRadius * Math.sin(angle);
    return { x, y, text: m.label };
  });

  return (
    <div className="relative flex justify-center py-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background Grids - Adjusted for light/dark visibility via CSS classes not possible inside SVG easily without currentColor, using opacity */}
        {webs.map((pointsStr, i) => (
          <polygon 
            key={i} 
            points={pointsStr} 
            fill="none" 
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1" 
          />
        ))}
        
        {/* Axis Lines */}
        {axes.map((axis, i) => (
          <line 
            key={i} 
            x1={axis.x1} 
            y1={axis.y1} 
            x2={axis.x2} 
            y2={axis.y2} 
            stroke="currentColor" 
            strokeOpacity="0.1"
            strokeWidth="1" 
          />
        ))}

        {/* Data Polygon */}
        <polygon 
          points={points} 
          fill="rgba(99, 102, 241, 0.4)" 
          stroke="#6366f1" 
          strokeWidth="2"
          className="drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
        />

        {/* Labels */}
        {labels.map((l, i) => (
          <text 
            key={i} 
            x={l.x} 
            y={l.y} 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="currentColor" 
            className="text-[10px] font-mono tracking-wider opacity-60"
          >
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  );
};

const MetricBar = ({ label, value, colorClass, icon: Icon }: any) => (
  <div className="flex flex-col gap-1 mb-3">
    <div className="flex justify-between items-end">
      <div className="flex items-center gap-2 text-coffee/80 dark:text-warm-text">
        <Icon size={14} className={colorClass} />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-xs font-mono font-bold ${colorClass}`}>{value}/10</span>
    </div>
    <div className="w-full h-1.5 bg-coffee/10 dark:bg-white/10 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-1000 ${colorClass.replace('text-', 'bg-')}`} 
        style={{ width: `${value * 10}%` }}
      />
    </div>
  </div>
);

const ResultView: React.FC<ResultViewProps> = ({ result, onClose }) => {
  // Fix: Provide default values for all score properties to avoid "Property does not exist on type '{}'" error.
  const scores = result.analysis?.scores || {
    comfort: 5,
    heaviness: 5,
    softness: 5,
    breathability: 5,
    elasticity: 5
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = result.image;
    link.download = `doppl-vton-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col xl:flex-row gap-8 animate-in fade-in slide-in-from-top-10 duration-500 mb-12 items-start justify-center">
      
      {/* Left: Main Image */}
      <div className="flex-1 w-full max-w-2xl flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4 text-accent font-medium uppercase tracking-widest text-xs">
          <ChevronDown size={14} className="animate-bounce" />
          生成結果 (Visual Output)
        </div>

        <div className="relative w-full group">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-coffee/10 dark:border-white/20 bg-sand dark:bg-charcoal">
            <img 
              src={result.image} 
              alt="Virtual Try-On Result" 
              className="w-full h-auto object-cover"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
              <div className="flex gap-3 justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors shadow-lg shadow-black/20"
                >
                  <Download size={18} />
                  儲存圖片
                </button>
                <button 
                  onClick={() => window.open(result.image, '_blank')}
                  className="p-2.5 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white/20 transition-colors"
                  title="在新分頁查看原圖"
                >
                  <Maximize2 size={18} />
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-red-500/80 backdrop-blur-md text-white rounded-full transition-all border border-white/10"
              title="關閉結果"
            >
              <X size={16} />
            </button>
          </div>
          <div className="absolute -inset-1 bg-gradient-to-r from-accent to-purple-600 rounded-2xl blur opacity-20 -z-10 group-hover:opacity-40 transition-opacity duration-500"></div>
        </div>
      </div>

      {/* Right: Phantom Haptics Dashboard */}
      <div className="w-full xl:w-[400px] shrink-0">
        <div className="bg-sand/80 dark:bg-charcoal/50 border border-coffee/10 dark:border-white/10 rounded-2xl p-6 backdrop-blur-md sticky top-24 shadow-xl transition-colors duration-500 text-coffee dark:text-warm-text">
          
          <div className="flex items-center gap-2 mb-6 border-b border-coffee/10 dark:border-white/10 pb-4">
            <Activity className="text-accent" size={20} />
            <h3 className="font-display font-bold text-coffee dark:text-white tracking-wide">PHANTOM HAPTICS</h3>
            <span className="text-[10px] bg-accent/10 dark:bg-accent/20 text-accent px-2 py-0.5 rounded ml-auto border border-accent/20">DATA VISUALIZATION</span>
          </div>

          {/* Radar Chart Section */}
          <div className="mb-8 bg-white/40 dark:bg-black/20 rounded-xl border border-coffee/5 dark:border-white/5 p-2">
            <div className="text-center text-[10px] text-coffee/50 dark:text-warm-text/50 uppercase tracking-widest mb-1">Physics Profile</div>
            <RadarChart scores={scores} />
          </div>

          {/* Detailed Metrics */}
          <div className="space-y-6">
            
            {/* Comfort */}
            <div className="group">
              <MetricBar 
                label="Comfort / 舒適度" 
                value={scores.comfort || 5} 
                colorClass="text-yellow-600 dark:text-yellow-400" 
                icon={Sparkles}
              />
              <p className="text-sm text-coffee/70 dark:text-warm-text/70 leading-relaxed pl-1 text-justify">
                {result.analysis?.comfort}
              </p>
            </div>

            {/* Breathability */}
            <div className="group border-t border-coffee/10 dark:border-white/5 pt-4">
              <MetricBar 
                label="Breathability / 透氣性" 
                value={scores.breathability || 5} 
                colorClass="text-green-600 dark:text-green-400" 
                icon={Wind}
              />
              <p className="text-sm text-coffee/70 dark:text-warm-text/70 leading-relaxed pl-1 text-justify">
                {result.analysis?.breathability}
              </p>
            </div>

            {/* Touch */}
            <div className="group border-t border-coffee/10 dark:border-white/5 pt-4">
               <MetricBar 
                label="Softness & Touch / 觸感" 
                value={scores.softness || 5} 
                colorClass="text-pink-600 dark:text-pink-400" 
                icon={HandMetal}
              />
              <p className="text-sm text-coffee/70 dark:text-warm-text/70 leading-relaxed pl-1 text-justify">
                {result.analysis?.touch}
              </p>
            </div>

            {/* Weight */}
            <div className="group border-t border-coffee/10 dark:border-white/5 pt-4">
               <MetricBar 
                label="Weight & Density / 重量感" 
                value={scores.heaviness || 5} 
                colorClass="text-blue-600 dark:text-blue-400" 
                icon={Scale}
              />
              <p className="text-sm text-coffee/70 dark:text-warm-text/70 leading-relaxed pl-1 text-justify">
                {result.analysis?.weight}
              </p>
            </div>

            {/* Elasticity (Extra) */}
            <div className="group border-t border-coffee/10 dark:border-white/5 pt-4">
               <MetricBar 
                label="Elasticity / 彈性係數" 
                value={scores.elasticity || 5} 
                colorClass="text-purple-600 dark:text-purple-400" 
                icon={Zap}
              />
            </div>

          </div>

          <div className="mt-8 pt-4 border-t border-coffee/10 dark:border-white/5">
             <div className="text-[10px] text-coffee/50 dark:text-warm-text/60 text-center flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                AI Inference Engine v3.0
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ResultView;