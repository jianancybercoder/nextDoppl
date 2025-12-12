import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Shirt, User, AlertTriangle, MessageSquare, Key, Eye, EyeOff, ExternalLink, RefreshCw, Trash2, Settings2, Sun, Moon, Upload, X, CheckCircle2, Loader2, Cpu, Download, Maximize2, ChevronDown, Activity, Wind, Scale, HandMetal, Zap, ArrowDown, ArrowRight } from 'lucide-react';

// ==========================================
// 1. TYPES & CONSTANTS
// ==========================================

export interface ImageFile {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  WARPING = 'WARPING',
  COMPOSITING = 'COMPOSITING',
  RENDERING = 'RENDERING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface VTONResult {
  image: string;
  analysis: {
    comfort: string;
    weight: string;
    touch: string;
    breathability: string;
    scores: {
      comfort: number;
      heaviness: number;
      softness: number;
      breathability: number;
      elasticity: number;
    };
    rawText: string;
  }
}

export const GENERATION_PHASES = [
  { id: AppStatus.ANALYZING, label: '語意與材質分析', detail: '識別姿勢，解析布料物理屬性...' },
  { id: AppStatus.WARPING, label: '物理模擬翹曲', detail: '建構 3D 體積，模擬重力垂墜...' },
  { id: AppStatus.COMPOSITING, label: '光場合成', detail: '處理遮擋、邊緣融合與修飾...' },
  { id: AppStatus.RENDERING, label: '觸感推論渲染', detail: '計算舒適度數據並輸出影像...' },
];

// ==========================================
// 2. SERVICES
// ==========================================

const SYSTEM_PROMPT = `
你是由 Google Gemini 模型驅動的頂尖 "Doppl-Next VTON Engine"。
你的核心任務是生成 **8K 攝影級真實感** 的虛擬試穿圖像，並提供 **物理觸感數據**。

# 任務 1：圖像生成 (優先級最高)
- **絕對真實感**：保留皮膚細節與布料織紋。
- **物理正確**：模擬重力垂墜與張力皺褶。
- **身份鎖定**：[輸入A] 的臉部必須完全保留。

# 任務 2：觸感分析報告 (必須輸出)
在生成圖像後，請 **務必** 輸出一塊 JSON 數據來分析穿著體驗。
無論如何，你都必須在回應的末尾包含這個 JSON 區塊。

JSON 格式要求如下 (請嚴格遵守 key 名稱)：
\`\`\`json
{
  "comfort": "一句話描述舒適度 (如: 柔軟親膚)",
  "weight": "一句話描述重量感 (如: 輕盈飄逸)",
  "touch": "一句話描述觸感 (如: 絲滑涼爽)",
  "breathability": "一句話描述透氣度 (如: 吸濕排汗)",
  "scores": {
    "comfort": 8,       // 1-10 (越高越舒適)
    "heaviness": 6,     // 1-10 (越高越重)
    "softness": 9,      // 1-10 (越高越軟)
    "breathability": 7, // 1-10 (越高越透氣)
    "elasticity": 5     // 1-10 (越高越彈)
  }
}
\`\`\`
`;

const generateVTON = async (
  apiKey: string,
  modelName: string,
  customPrompt: string,
  userImageBase64: string,
  userImageMime: string,
  garmentImageBase64: string,
  garmentImageMime: string
): Promise<VTONResult> => {
  
  const cleanKey = apiKey.trim();

  if (!cleanKey) {
    throw new Error("請輸入有效的 Gemini API Key。");
  }

  if (!cleanKey.startsWith("AIza")) {
    throw new Error("API Key 格式似乎不正確 (應以 'AIza' 開頭)。");
  }

  const targetModel = modelName || 'gemini-2.5-flash-image';

  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });

    const parts: any[] = [
      { text: SYSTEM_PROMPT },
      {
        inlineData: {
          mimeType: userImageMime,
          data: userImageBase64
        }
      },
      { text: "【輸入 A：使用者原圖】" },
      {
        inlineData: {
          mimeType: garmentImageMime,
          data: garmentImageBase64
        }
      },
      { text: "【輸入 B：目標服飾】" }
    ];

    if (customPrompt && customPrompt.trim().length > 0) {
      parts.push({ 
        text: `【使用者額外指令】: ${customPrompt}。記得在回應最後附上 JSON 分析數據。` 
      });
    } else {
      parts.push({ text: "請生成試穿圖像，並在最後附上詳細的 JSON 觸感數據分析。" });
    }

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: { parts: parts },
      config: {
        // No responseMimeType to allow mixed modality output
      } as any 
    });

    const responseParts = response.candidates?.[0]?.content?.parts;
    
    let imageBase64: string | null = null;
    let textAnalysis: string = "";

    if (responseParts) {
      for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
          imageBase64 = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textAnalysis += part.text;
        }
      }
    }

    if (!imageBase64) {
      throw new Error(`模型生成失敗，未返回圖像數據。請嘗試更換模型或圖片。`);
    }

    // Default structure
    let analysisData = {
      comfort: "分析中... (解析失敗)",
      weight: "分析中... (解析失敗)",
      touch: "分析中... (解析失敗)",
      breathability: "分析中... (解析失敗)",
      scores: {
        comfort: 5,
        heaviness: 5,
        softness: 5,
        breathability: 5,
        elasticity: 5
      },
      rawText: textAnalysis
    };

    // --- Enhanced Parsing Logic ---
    let parsedSuccessfully = false;

    try {
      const jsonMatch = textAnalysis.match(/```json\s*([\s\S]*?)\s*```/) || 
                        textAnalysis.match(/```\s*([\s\S]*?)\s*```/) || 
                        textAnalysis.match(/\{[\s\S]*\}/); 

      if (jsonMatch) {
        let jsonStr = jsonMatch[1] || jsonMatch[0];
        jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        const parsed = JSON.parse(jsonStr);
        analysisData = { 
          ...analysisData, 
          ...parsed,
          scores: { ...analysisData.scores, ...(parsed.scores || {}) }
        };
        parsedSuccessfully = true;
      }
    } catch (e) {
      console.warn("JSON Parse failed, attempting heuristic extraction...", e);
    }

    // Heuristic Extraction
    if (!parsedSuccessfully && textAnalysis.length > 0) {
      const extractScore = (key: string) => {
        const regex = new RegExp(`["']?${key}["']?\\s*:\\s*(\\d+)`, 'i');
        const match = textAnalysis.match(regex);
        return match ? parseInt(match[1]) : null;
      };

      const extractText = (key: string) => {
        const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`, 'i');
        const match = textAnalysis.match(regex);
        return match ? match[1] : null;
      };

      const s_comfort = extractScore('comfort');
      if (s_comfort !== null) analysisData.scores.comfort = s_comfort;

      const s_heaviness = extractScore('heaviness') || extractScore('weight');
      if (s_heaviness !== null) analysisData.scores.heaviness = s_heaviness;

      const s_softness = extractScore('softness') || extractScore('touch');
      if (s_softness !== null) analysisData.scores.softness = s_softness;

      const s_breathability = extractScore('breathability');
      if (s_breathability !== null) analysisData.scores.breathability = s_breathability;

      const s_elasticity = extractScore('elasticity');
      if (s_elasticity !== null) analysisData.scores.elasticity = s_elasticity;

      const t_comfort = extractText('comfort');
      if (t_comfort) analysisData.comfort = t_comfort;
      
      const t_weight = extractText('weight');
      if (t_weight) analysisData.weight = t_weight;
      
      const t_touch = extractText('touch');
      if (t_touch) analysisData.touch = t_touch;
      
      const t_breathability = extractText('breathability');
      if (t_breathability) analysisData.breathability = t_breathability;
    }

    return {
      image: imageBase64,
      analysis: analysisData
    };

  } catch (error: any) {
    console.error("Gemini VTON Generation Error:", error);
    if (error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED')) {
      throw new Error(`權限被拒 (403)。請檢查 API Key 或 Google Cloud 專案設定。`);
    }
    if (error.message?.includes('429')) {
      throw new Error("請求過於頻繁 (Rate Limit)。請稍後再試。");
    }
    if (error.message?.includes('400')) {
        throw new Error("請求無效 (400)。圖片格式不支援或過大。");
    }
    throw error;
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1]; 
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

// ==========================================
// 3. COMPONENTS
// ==========================================

// --- ImageUploadCard ---
interface ImageUploadCardProps {
  id: string;
  label: string;
  subLabel: string;
  image: ImageFile | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
  className?: string;
}

const ImageUploadCard: React.FC<ImageUploadCardProps> = ({
  id,
  label,
  subLabel,
  image,
  onUpload,
  onRemove,
  disabled = false,
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex justify-between items-baseline px-1">
        <label htmlFor={id} className="text-sm font-semibold text-coffee/80 dark:text-warm-text/80 uppercase tracking-wider font-display">
          {label}
        </label>
        <span className="text-[10px] sm:text-xs text-coffee/50 dark:text-warm-text/50">{subLabel}</span>
      </div>

      <div
        className={`
          relative group flex flex-col items-center justify-center w-full aspect-[3/4] 
          rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden shadow-sm
          ${image 
            ? 'border-accent/50 bg-white dark:bg-charcoal' 
            : 'border-coffee/10 dark:border-white/10 bg-white/50 dark:bg-charcoal/50 hover:border-accent/30 dark:hover:border-white/20 hover:bg-white dark:hover:bg-charcoal/80'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
        `}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !image && !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />

        {image ? (
          <>
            <img 
              src={image.previewUrl} 
              alt={label} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-500/80 backdrop-blur-md rounded-full text-white transition-all shadow-lg active:scale-95"
              >
                <X size={16} />
              </button>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </>
        ) : (
          <div className="flex flex-col items-center text-center p-6 space-y-4">
            <div className="p-4 rounded-full bg-coffee/5 dark:bg-white/5 group-hover:bg-accent/10 transition-colors duration-300">
              <Upload size={24} className="text-coffee/40 dark:text-warm-text/40 group-hover:text-accent transition-colors" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-coffee dark:text-warm-text">
                <span className="text-accent">點擊上傳</span> 或拖放
              </p>
              <p className="text-[10px] text-coffee/50 dark:text-warm-text/50">JPG, PNG (Max 10MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- ProcessingOverlay ---
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sand/90 dark:bg-black/90 backdrop-blur-md transition-all duration-500 p-4">
      <div className="w-full max-w-md bg-paper dark:bg-charcoal border border-coffee/10 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden transition-colors duration-500 ring-1 ring-white/20">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_0%,rgba(99,102,241,0.1)_50%,transparent_100%)] animate-scan" style={{ backgroundSize: '100% 200%' }} />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-6 animate-pulse-slow shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Cpu className="w-8 h-8 text-accent" />
          </div>

          <h3 className="text-xl font-bold text-coffee dark:text-white mb-2 font-display tracking-tight">Doppl-Next 引擎</h3>
          <p className="text-coffee/60 dark:text-warm-text/60 text-sm mb-8 text-center">AI 正在進行高階物理合成...</p>

          <div className="w-full space-y-3">
            {GENERATION_PHASES.map((phase, index) => {
              const isActive = index === currentPhaseIndex;
              const isCompleted = index < currentPhaseIndex;

              return (
                <div 
                  key={phase.id} 
                  className={`
                    flex items-center gap-4 p-3 rounded-xl transition-all duration-500
                    ${isActive ? 'bg-coffee/5 dark:bg-white/5 border border-accent/30 scale-102 shadow-sm' : 'opacity-50'}
                  `}
                >
                  <div className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-coffee/20 dark:border-warm-text/20" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium truncate ${isActive ? 'text-coffee dark:text-white' : 'text-coffee/50 dark:text-warm-text/50'}`}>
                      {phase.label}
                    </h4>
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

// --- ResultView ---
interface ResultViewProps {
  result: VTONResult;
  onClose: () => void;
}

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

  const points = metrics.map((metric, i) => {
    const value = (scores[metric.key] || 5) / 10;
    const angle = i * angleStep - Math.PI / 2;
    const r = value * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const webs = [0.2, 0.4, 0.6, 0.8, 1].map((scale) => {
    return metrics.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = radius * scale;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  });

  const axes = metrics.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x1: center, y1: center, x2: x, y2: y };
  });

  const labels = metrics.map((m, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 20;
    const x = center + labelRadius * Math.cos(angle);
    const y = center + labelRadius * Math.sin(angle);
    return { x, y, text: m.label };
  });

  return (
    <div className="relative flex justify-center py-4 w-full h-[220px]">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
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
        <polygon 
          points={points} 
          fill="rgba(99, 102, 241, 0.4)" 
          stroke="#6366f1" 
          strokeWidth="2"
          className="drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
        />
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

  const handleOpenFullImage = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en" style="margin:0;height:100%;background:#191716;display:flex;align-items:center;justify-content:center;">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Doppl-Next Full View</title>
          <style>body{margin:0;overflow:hidden;}</style>
        </head>
        <body>
          <img src="${result.image}" style="max-width:100%;max-height:100vh;object-fit:contain;box-shadow:0 0 40px rgba(0,0,0,0.5);" alt="Full View" />
        </body>
        </html>
      `);
      newWindow.document.close();
    } else {
      alert("請允許開啟彈跳視窗以檢視全圖。");
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-top-10 duration-500 mb-12 items-start justify-center">
      <div className="flex-1 w-full max-w-3xl flex flex-col items-center">
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
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
              <div className="flex gap-3 justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors shadow-lg shadow-black/20 active:scale-95"
                >
                  <Download size={18} />
                  儲存圖片
                </button>
                <button 
                  onClick={handleOpenFullImage}
                  className="p-2.5 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white/20 transition-colors active:scale-95"
                  title="在新分頁查看原圖"
                >
                  <Maximize2 size={18} />
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-red-500/80 backdrop-blur-md text-white rounded-full transition-all border border-white/10 active:scale-95"
              title="關閉結果"
            >
              <X size={16} />
            </button>
          </div>
          <div className="absolute -inset-1 bg-gradient-to-r from-accent to-purple-600 rounded-2xl blur opacity-20 -z-10 group-hover:opacity-40 transition-opacity duration-500"></div>
        </div>
      </div>

      <div className="w-full lg:w-[380px] shrink-0">
        <div className="bg-sand/80 dark:bg-charcoal/50 border border-coffee/10 dark:border-white/10 rounded-2xl p-6 backdrop-blur-md sticky top-24 shadow-xl transition-colors duration-500 text-coffee dark:text-warm-text">
          <div className="flex items-center gap-2 mb-6 border-b border-coffee/10 dark:border-white/10 pb-4">
            <Activity className="text-accent" size={20} />
            <h3 className="font-display font-bold text-coffee dark:text-white tracking-wide">PHANTOM HAPTICS</h3>
            <span className="text-[10px] bg-accent/10 dark:bg-accent/20 text-accent px-2 py-0.5 rounded ml-auto border border-accent/20">DATA</span>
          </div>

          <div className="mb-8 bg-white/40 dark:bg-black/20 rounded-xl border border-coffee/5 dark:border-white/5 p-4 flex justify-center">
            <RadarChart scores={scores} />
          </div>

          <div className="space-y-6">
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

// ==========================================
// 4. MAIN APP COMPONENT
// ==========================================

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [modelName, setModelName] = useState<string>('gemini-2.5-flash-image');
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [userImage, setUserImage] = useState<ImageFile | null>(null);
  const [garmentImage, setGarmentImage] = useState<ImageFile | null>(null);
  const [promptText, setPromptText] = useState<string>('');
  const [resultData, setResultData] = useState<VTONResult | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resultSectionRef = useRef<HTMLDivElement>(null);
  const isGeneratingRef = useRef<boolean>(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value.trim();
    setApiKey(newKey);
    localStorage.setItem('gemini_api_key', newKey);
  };

  const handleImageUpload = async (file: File, type: 'user' | 'garment') => {
    try {
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      const imageFile: ImageFile = {
        file,
        previewUrl,
        base64,
        mimeType: file.type
      };
      if (type === 'user') setUserImage(imageFile);
      else setGarmentImage(imageFile);
      setErrorMsg(null);
    } catch (err) {
      console.error("File processing error", err);
      setErrorMsg("圖片處理失敗，請嘗試其他檔案。");
    }
  };

  const simulatePhases = async () => {
    if (!isGeneratingRef.current) return;
    setStatus(AppStatus.ANALYZING);
    await new Promise(r => setTimeout(r, 2000));
    
    if (!isGeneratingRef.current) return;
    setStatus(AppStatus.WARPING);
    await new Promise(r => setTimeout(r, 2500));
    
    if (!isGeneratingRef.current) return;
    setStatus(AppStatus.COMPOSITING);
    await new Promise(r => setTimeout(r, 2000));
    
    if (!isGeneratingRef.current) return;
    setStatus(AppStatus.RENDERING);
  };

  const handleGenerate = async () => {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setErrorMsg("請輸入您的 Gemini API Key 才能開始生成。");
      return;
    }
    if (!userImage || !garmentImage) return;
    
    setErrorMsg(null);
    isGeneratingRef.current = true;

    const phasesPromise = simulatePhases();
    const generationPromise = generateVTON(
      cleanKey,
      modelName,
      promptText,
      userImage.base64,
      userImage.mimeType,
      garmentImage.base64,
      garmentImage.mimeType
    );

    try {
      const [_, result] = await Promise.all([phasesPromise, generationPromise]);
      
      if (isGeneratingRef.current) {
        setResultData(result);
        setStatus(AppStatus.COMPLETE);
        setTimeout(() => {
          resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } catch (error: any) {
      console.error("Generation failed", error);
      isGeneratingRef.current = false;
      setStatus(AppStatus.ERROR);
      if (error.message) {
         setErrorMsg(error.message);
      } else {
         setErrorMsg("生成失敗。請檢查網路連線或稍後再試。");
      }
    } finally {
      isGeneratingRef.current = false;
    }
  };

  const handleCloseResult = () => {
    setResultData(null);
    setStatus(AppStatus.IDLE);
  };

  const fullReset = () => {
    setResultData(null);
    setUserImage(null);
    setGarmentImage(null);
    setPromptText('');
    setStatus(AppStatus.IDLE);
    setErrorMsg(null);
    isGeneratingRef.current = false;
  };

  const isProcessing = status === AppStatus.UPLOADING || 
                       status === AppStatus.ANALYZING || 
                       status === AppStatus.WARPING || 
                       status === AppStatus.COMPOSITING || 
                       status === AppStatus.RENDERING;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen transition-colors duration-500 bg-paper text-coffee dark:bg-obsidian dark:text-warm-text font-sans selection:bg-accent/30 selection:text-coffee dark:selection:text-warm-text pb-20">
        <ProcessingOverlay status={status} />

        <header className="fixed top-0 left-0 right-0 z-40 bg-paper/80 dark:bg-obsidian/80 backdrop-blur-md border-b border-coffee/5 dark:border-white/5 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-coffee dark:text-white">Doppl-Next</span>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
               <div className="flex items-center gap-2 text-xs font-mono text-coffee/70 dark:text-warm-text/70 bg-sand dark:bg-white/5 px-2 py-1.5 md:px-3 rounded-full border border-coffee/10 dark:border-white/5 transition-colors hover:border-accent/30">
                  <Settings2 size={12} className="shrink-0" />
                  <select 
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="bg-transparent border-none outline-none text-coffee dark:text-warm-text cursor-pointer max-w-[80px] md:max-w-none truncate [&>option]:text-black [&>option]:bg-white"
                    disabled={isProcessing}
                  >
                    <option value="gemini-2.5-flash-image">Flash 2.5</option>
                    <option value="gemini-2.0-flash-exp">Flash 2.0 (Exp)</option>
                    <option value="gemini-3-pro-image-preview">Pro 3 (High)</option>
                  </select>
               </div>
               <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-full hover:bg-coffee/5 dark:hover:bg-white/10 transition-colors text-coffee dark:text-warm-text/80 active:scale-90"
                  title={darkMode ? "切換亮色模式" : "切換暗色模式"}
               >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
               </button>
            </div>
          </div>
        </header>

        <main className="pt-24 px-4 md:px-6 max-w-7xl mx-auto flex flex-col items-center">
          {!resultData && (
            <div className="text-center space-y-4 max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-3xl md:text-5xl font-display font-bold text-coffee dark:text-white tracking-tight leading-tight">
                Gemini 3 Pro <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">真實物理 VTON 引擎</span>
              </h1>
              <p className="text-coffee/70 dark:text-warm-text/70 text-base md:text-lg leading-relaxed px-4">
                上傳照片與服裝。利用高階物理模擬與 <span className="text-coffee dark:text-white font-medium">Phantom Haptics</span> 觸感分析技術，合成 8K 級的攝影擬真試穿效果。
              </p>
            </div>
          )}

          {resultData && (
            <div ref={resultSectionRef} className="w-full flex justify-center mb-8">
               <ResultView result={resultData} onClose={handleCloseResult} />
            </div>
          )}

          <div className="w-full max-w-4xl space-y-8">
            <div className="bg-sand/60 dark:bg-charcoal/30 border border-coffee/5 dark:border-white/5 rounded-3xl p-5 md:p-8 backdrop-blur-sm shadow-xl dark:shadow-none transition-colors duration-500">
              <div className="w-full mb-8">
                <div className="flex justify-between items-center px-1 mb-2">
                  <label className="text-xs font-medium text-coffee/60 dark:text-warm-text/60 uppercase tracking-wider">
                    Gemini API 設定
                  </label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-glow transition-colors"
                  >
                    <span>取得 API Key</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
                <div className="w-full bg-white dark:bg-charcoal border border-coffee/10 dark:border-white/10 rounded-xl p-3 flex items-center gap-3 transition-colors hover:border-accent/30 focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/50 shadow-sm dark:shadow-none">
                  <Key size={18} className="text-coffee/40 dark:text-warm-text/40 shrink-0" />
                  <input 
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder="在此輸入您的 Gemini API Key (AIza開頭)"
                    className="bg-transparent border-none outline-none flex-1 text-sm text-coffee dark:text-warm-text placeholder-coffee/30 dark:placeholder-warm-text/30 font-mono"
                  />
                  <button 
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-coffee/40 dark:text-warm-text/50 hover:text-coffee dark:hover:text-warm-text transition-colors"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-coffee/50 dark:text-warm-text/50 mt-2 px-1 leading-relaxed">
                  * 若持續顯示 403 錯誤，請切換至 <strong>Flash 2.0 (Exp)</strong> 模型，或檢查您的 Google Cloud 專案是否啟用 Generative AI API。
                </p>
              </div>

              {errorMsg && (
                <div className="w-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-200 p-4 rounded-xl flex items-start gap-3 mb-8 animate-in fade-in slide-in-from-top-2 shadow-sm">
                  <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                  <p className="text-sm whitespace-pre-line leading-relaxed font-medium">{errorMsg}</p>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-8 relative">
                <ImageUploadCard
                  id="user-upload"
                  label="目標使用者"
                  subLabel="全身或半身照片"
                  image={userImage}
                  onUpload={(f) => handleImageUpload(f, 'user')}
                  onRemove={() => setUserImage(null)}
                  disabled={isProcessing}
                  className="w-full md:flex-1 min-w-0"
                />

                {/* Mobile Connector */}
                <div className="md:hidden flex justify-center -my-4 z-10 pointer-events-none">
                   <div className="p-2 rounded-full bg-paper dark:bg-obsidian border border-coffee/10 dark:border-white/10 shadow-lg text-coffee/30 dark:text-warm-text/30">
                     <ArrowDown size={16} />
                   </div>
                </div>

                {/* Desktop Connector */}
                <div className="hidden md:flex flex-col justify-center items-center text-coffee/30 dark:text-warm-text/30 px-2 shrink-0">
                  <div className="h-full w-px bg-gradient-to-b from-transparent via-coffee/10 dark:via-white/10 to-transparent absolute"></div>
                  <div className="p-3 border border-coffee/10 dark:border-white/10 rounded-full bg-paper dark:bg-obsidian z-10 shadow-xl transition-colors duration-500">
                    {isProcessing ? (
                       <RefreshCw size={16} className="text-accent animate-spin" />
                    ) : (
                       <div className="flex gap-2">
                         <User size={16} className="text-coffee/40 dark:text-warm-text/40" />
                         <ArrowRight size={16} className="text-coffee/20 dark:text-warm-text/20" />
                         <Shirt size={16} className="text-coffee/40 dark:text-warm-text/40" />
                       </div>
                    )}
                  </div>
                </div>

                <ImageUploadCard
                  id="garment-upload"
                  label="目標服飾"
                  subLabel="平拍或模特兒照片"
                  image={garmentImage}
                  onUpload={(f) => handleImageUpload(f, 'garment')}
                  onRemove={() => setGarmentImage(null)}
                  disabled={isProcessing}
                  className="w-full md:flex-1 min-w-0"
                />
              </div>

              <div className="space-y-3">
                <label htmlFor="prompt-input" className="flex items-center gap-2 text-sm font-medium text-coffee/80 dark:text-warm-text/80 ml-1">
                  <MessageSquare size={16} className="text-accent" />
                  {resultData ? '微調需求 / 追加指令' : '詳細微調需求 (選填)'}
                </label>
                <textarea
                  id="prompt-input"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder={resultData 
                    ? "例如：請把褲子改短一點、讓光線亮一點，或試著把衣服紮進去... (直接輸入新指令，點擊下方重新生成)" 
                    : "例如：請保留我的手錶，並讓衣服看起來更寬鬆一點..."}
                  className="w-full h-24 bg-white dark:bg-charcoal border border-coffee/10 dark:border-white/10 rounded-xl p-4 text-sm text-coffee dark:text-warm-text placeholder-coffee/40 dark:placeholder-warm-text/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all resize-none shadow-sm dark:shadow-none"
                  disabled={isProcessing}
                />
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {resultData && (
                  <button
                    onClick={fullReset}
                    className="px-6 py-4 rounded-xl border border-coffee/10 dark:border-white/10 bg-white dark:bg-white/5 text-coffee/70 dark:text-warm-text/70 font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                    disabled={isProcessing}
                  >
                    <Trash2 size={18} />
                    <span className="sm:hidden md:inline">重來</span>
                  </button>
                )}
                
                <button
                  onClick={handleGenerate}
                  disabled={isProcessing || !apiKey || !userImage || !garmentImage}
                  className={`
                    flex-1 py-4 rounded-xl font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-accent/20
                    transition-all duration-300 active:scale-95
                    ${(isProcessing || !apiKey || !userImage || !garmentImage)
                      ? 'bg-gray-200 dark:bg-charcoal/50 text-gray-400 dark:text-white/30 cursor-not-allowed border border-transparent dark:border-white/5' 
                      : 'bg-gradient-to-r from-accent to-purple-600 hover:from-accent-glow hover:to-purple-500 text-white border border-transparent dark:border-white/10 hover:shadow-accent/40'}
                  `}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} />
                      <span>PROCESSING...</span>
                    </>
                  ) : resultData ? (
                    <>
                      <Sparkles size={20} />
                      <span>依據新設定重新生成</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>啟動 VTON 引擎</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// ==========================================
// 5. ROOT RENDER
// ==========================================

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);