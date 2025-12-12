
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Shirt, User, AlertTriangle, MessageSquare, Key, Eye, EyeOff, ExternalLink, RefreshCw, Trash2, Settings, Sun, Moon, Globe, Server, Box, Check, X, Wifi, AlertCircle, CheckCircle, Languages, Upload, Download, Maximize2, ChevronDown, Activity, Wind, Scale, HandMetal, Zap, CheckCircle2, Loader2, Cpu } from 'lucide-react';

// ============================================================================
// PART 1: Types & Interfaces
// ============================================================================

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

export type ProviderType = 'google' | 'custom';
export type Language = 'zh-TW' | 'en';

export interface CustomConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  detail?: string;
}

export interface UniversalApiInput {
  baseUrl?: string;
  apiKey: string;
  model: string;
  messages?: any[];
  parts?: any[];
  temperature?: number;
  maxTokens?: number;
}

export interface UniversalApiResponse {
  content: string;
  images: string[];
  raw?: any;
}

// ============================================================================
// PART 2: Locales
// ============================================================================

export const translations = {
  'zh-TW': {
    appTitle: 'Doppl-Next',
    heroTitle: '真實物理 VTON 引擎',
    heroSubtitle: '上傳照片與服裝。利用高階物理模擬與 Phantom Haptics 觸感分析技術，合成 8K 級的攝影擬真試穿效果。',
    settings: {
      title: '引擎設定',
      provider: 'AI 模型供應商',
      apiKey: 'API Key',
      getKey: '取得 Key',
      modelSelect: '模型選擇',
      modelHint: '* 推薦使用 Flash 2.5 以獲得最佳速度與免費額度。',
      customHint: '適用於支援 OpenAI Chat API 格式的服務 (如 OpenRouter, DeepSeek)。模型必須具備 Vision 能力。',
      baseUrl: 'Base URL',
      baseUrlHint: '* 請輸入包含 /v1 的完整 Base Path (如果需要)。',
      modelId: 'Model ID',
      testConn: '測試連線',
      testing: '連線測試中...',
      testSuccess: '連線驗證成功',
      testFail: '連線失敗',
      complete: '完成設定'
    },
    upload: {
      userLabel: '目標使用者',
      userSub: '全身或半身照片',
      garmentLabel: '目標服飾',
      garmentSub: '平拍或模特兒照片',
      clickToUpload: '點擊上傳',
      dragDrop: '或拖放',
      remove: '移除'
    },
    prompt: {
      label: '詳細微調需求 (選填)',
      labelRefine: '微調需求 / 追加指令',
      placeholder: '例如：請保留我的手錶，並讓衣服看起來更寬鬆一點...',
      placeholderRefine: '例如：請把褲子改短一點、讓光線亮一點...'
    },
    actions: {
      reset: '重來',
      generate: '啟動 VTON 引擎',
      regenerate: '依據新設定重新生成',
      processing: 'PROCESSING...',
      setupKey: '設定 Key 並啟動'
    },
    result: {
      title: '生成結果',
      download: '儲存圖片',
      hapticsTitle: 'PHANTOM HAPTICS',
      dataVis: '數據可視化',
      profile: '物理屬性圖譜',
      metrics: {
        comfort: '舒適度',
        breathability: '透氣性',
        touch: '觸感',
        weight: '重量感',
        elasticity: '彈性係數'
      }
    },
    phases: {
      [AppStatus.ANALYZING]: { label: '第一階段：語意與材質分析', detail: '識別使用者姿勢，解析服裝布料物理屬性...' },
      [AppStatus.WARPING]: { label: '第二階段：物理模擬翹曲', detail: '建構 3D 體積，模擬重力與布料張力...' },
      [AppStatus.COMPOSITING]: { label: '第三階段：光場合成', detail: '處理遮擋、邊緣融合與細節修飾...' },
      [AppStatus.RENDERING]: { label: '第四階段：觸感推論與渲染', detail: '計算穿著舒適度數據並輸出最終影像...' },
    },
    errors: {
      noKey: '請先設定 Google API Key。',
      incompleteCustom: '請完整填寫自定義 API 設定。',
      processFailed: '圖片處理失敗，請嘗試其他檔案。',
      genFailed: '生成失敗。請檢查設定或網路連線。'
    }
  },
  'en': {
    appTitle: 'Doppl-Next',
    heroTitle: 'Hyper-Realistic VTON Engine',
    heroSubtitle: 'Upload photos and garments. Synthesize 8K photorealistic virtual try-on results using advanced physics simulation and Phantom Haptics analysis.',
    settings: {
      title: 'Engine Settings',
      provider: 'AI Provider',
      apiKey: 'API Key',
      getKey: 'Get Key',
      modelSelect: 'Model Selection',
      modelHint: '* Flash 2.5 is recommended for best speed and free tier.',
      customHint: 'For services supporting OpenAI Chat API format (e.g., OpenRouter, DeepSeek). Model must have Vision capabilities.',
      baseUrl: 'Base URL',
      baseUrlHint: '* Enter full Base Path including /v1 if required.',
      modelId: 'Model ID',
      testConn: 'Test Connection',
      testing: 'Testing...',
      testSuccess: 'Connection Verified',
      testFail: 'Connection Failed',
      complete: 'Done'
    },
    upload: {
      userLabel: 'Target User',
      userSub: 'Full/Half Body Photo',
      garmentLabel: 'Target Garment',
      garmentSub: 'Flat Lay or Model Photo',
      clickToUpload: 'Click to Upload',
      dragDrop: 'or Drag & Drop',
      remove: 'Remove'
    },
    prompt: {
      label: 'Refinement Instructions (Optional)',
      labelRefine: 'Refine / Additional Prompts',
      placeholder: 'E.g., Keep my watch visible and make the fit looser...',
      placeholderRefine: 'E.g., Make the pants shorter, brighten the lighting...'
    },
    actions: {
      reset: 'Reset',
      generate: 'Ignite Engine',
      regenerate: 'Regenerate',
      processing: 'PROCESSING...',
      setupKey: 'Set Key & Start'
    },
    result: {
      title: 'Visual Output',
      download: 'Save Image',
      hapticsTitle: 'PHANTOM HAPTICS',
      dataVis: 'DATA VISUALIZATION',
      profile: 'Physics Profile',
      metrics: {
        comfort: 'Comfort',
        breathability: 'Breathability',
        touch: 'Softness & Touch',
        weight: 'Weight & Density',
        elasticity: 'Elasticity'
      }
    },
    phases: {
      [AppStatus.ANALYZING]: { label: 'Phase 1: Semantic & Material Analysis', detail: 'Identifying pose, parsing fabric physics...' },
      [AppStatus.WARPING]: { label: 'Phase 2: Physics-Based Warping', detail: 'Building 3D volume, simulating gravity & tension...' },
      [AppStatus.COMPOSITING]: { label: 'Phase 3: Optical Composition', detail: 'Handling occlusion, edge fusion & detailing...' },
      [AppStatus.RENDERING]: { label: 'Phase 4: Haptic Inference & Rendering', detail: 'Calculating comfort data & rendering final output...' },
    },
    errors: {
      noKey: 'Please set your Google API Key first.',
      incompleteCustom: 'Please complete the Custom API settings.',
      processFailed: 'Failed to process image. Please try another file.',
      genFailed: 'Generation failed. Check settings or network connection.'
    }
  }
};

// ============================================================================
// PART 3: Services (Gemini / Universal API)
// ============================================================================

const getSystemPrompt = (lang: Language) => `
你是由 Gemini 3 Pro 驅動的頂尖 "Doppl-Next VTON Engine" (虛擬試穿引擎)。

**核心任務 (Core Task)**：
將「目標服飾 (Input B)」完美合成至「使用者 (Input A)」身上，生成一張極具真實感的虛擬試穿照片。

**關鍵約束 (CRITICAL CONSTRAINTS) - 必須嚴格遵守**：
1. **絕對保留身份特徵 (Identity Preservation)**：
   - 使用者的臉部、五官、表情、髮型、髮色、膚色與體型特徵必須 **100% 保持原樣**。
   - **嚴禁** 重繪臉部或讓臉部變形。這是最高優先級指令。
2. **極致物理模擬 (Hyper-Realistic Physics)**：
   - **重力與垂墜感**：模擬布料在身體上的自然垂墜，考慮重力影響。
   - **材質與紋理**：保留服裝的高解析度紋理 (Texture)、光澤與細節。
   - **皺褶生成**：根據人體姿態生成自然的衣物皺褶。
   - **遮擋處理 (Occlusion)**：正確處理頭髮、手部、飾品與衣物的遮擋關係 (例如：頭髮披在肩膀時，衣服應在頭髮下方)。
3. **光影融合 (Lighting Integration)**：
   - 衣服的光影、色溫與對比度必須與使用者原圖的環境光完美匹配。

**輸出格式 (Output Format)**：
1. **圖像生成**：請生成合成後的 VTON 圖像。
2. **觸感數據 (Phantom Haptics)**：圖像後方必須包含以下 JSON 區塊，除此之外不要有多餘的廢話。
   **注意**：JSON 中的 "comfort", "weight", "touch", "breathability" 的文字描述必須使用 **${lang === 'zh-TW' ? '繁體中文' : '英文 (English)'}** 撰寫。

\`\`\`json
{
  "comfort": "文字描述 (如: 柔軟親膚，適合全天穿著)",
  "weight": "文字描述 (如: 輕盈如羽毛)",
  "touch": "文字描述 (如: 絲滑涼感)",
  "breathability": "文字描述 (如: 高透氣網眼結構)",
  "scores": {
    "comfort": 8,       // 1-10
    "heaviness": 6,     // 1-10 (1=輕, 10=重)
    "softness": 9,      // 1-10
    "breathability": 7, // 1-10
    "elasticity": 5     // 1-10
  }
}
\`\`\`
`;

const normalizeApiResponse = (data: any): UniversalApiResponse => {
  if (data.choices && data.choices[0]?.message) {
    return {
      content: data.choices[0].message.content || "",
      images: [],
      raw: data
    };
  }
  if (data.data && Array.isArray(data.data)) {
    const images = data.data.map((d: any) => d.url || d.b64_json).filter(Boolean);
    return {
      content: "",
      images: images,
      raw: data
    };
  }
  if (data.output) {
     const images = Array.isArray(data.output) ? data.output.map((o:any) => o.url || o) : [data.output];
     return {
       content: "",
       images: images,
       raw: data
     };
  }
  if (typeof data === 'string') {
    return {
      content: data,
      images: [],
      raw: data
    };
  }
  throw new Error("Unknown API response format. Response Normalization Failed.");
};

const constructEndpoint = (baseUrl: string): string => {
  let endpoint = baseUrl.replace(/\/$/, ""); 
  if (!endpoint.endsWith('/chat/completions')) {
     endpoint = `${endpoint}/chat/completions`;
  }
  return endpoint;
};

const callGenericServer = async (input: UniversalApiInput): Promise<UniversalApiResponse> => {
  const { baseUrl, apiKey, model, messages, maxTokens = 4096 } = input;
  if (!baseUrl) throw new Error("Base URL is required for custom providers.");
  const endpoint = constructEndpoint(baseUrl);
  const body = {
    model: model,
    messages: messages,
    max_tokens: maxTokens,
    stream: false 
  };
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Doppl-Next VTON'
      },
      body: JSON.stringify(body)
    });
    const responseText = await res.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`API Response is not JSON (Likely HTML/Error Page).\nEndpoint: ${endpoint}\nSnippet: ${responseText.slice(0, 100)}...`);
    }
    if (!res.ok) {
      const errMsg = data.error?.message || data.message || JSON.stringify(data);
      throw new Error(`API Error (${res.status}): ${errMsg}`);
    }
    return normalizeApiResponse(data);
  } catch (error: any) {
    throw error;
  }
};

const callGoogleSdk = async (input: UniversalApiInput, systemPrompt: string): Promise<UniversalApiResponse> => {
  const { apiKey, model, parts } = input;
  if (!apiKey.startsWith("AIza")) {
    throw new Error("Google API Key format incorrect (Must start with AIza).");
  }
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        systemInstruction: systemPrompt,
      },
    });
    const responseParts = response.candidates?.[0]?.content?.parts;
    let content = "";
    let images: string[] = [];
    if (responseParts) {
      for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
          images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
        } else if (part.text) {
          content += part.text;
        }
      }
    }
    return { content, images, raw: response };
  } catch (error: any) {
    if (error.message?.includes('403')) {
      throw new Error("Google 403 Forbidden: Check API Key or Model Access.");
    }
    throw error;
  }
};

export const testCustomConnection = async (config: CustomConfig): Promise<ConnectionTestResult> => {
  const { baseUrl, apiKey, modelName } = config;
  if (!baseUrl || !apiKey || !modelName) {
    return { ok: false, message: "⚠️ 請填寫完整欄位 (URL, Key, Model)" };
  }
  const endpoint = constructEndpoint(baseUrl);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 1
      })
    });
    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errData = await res.json();
        errorMsg = errData.error?.message || errData.message || errorMsg;
      } catch (e) {
        const text = await res.text();
        errorMsg = `Server Error: ${text.slice(0, 50)}...`;
      }
      if (res.status === 401) return { ok: false, message: "❌ 認證失敗 (401)", detail: "API Key 無效或過期" };
      if (res.status === 404) return { ok: false, message: "❌ 找不到資源 (404)", detail: "模型名稱錯誤 或 Base URL 不正確" };
      return { ok: false, message: `❌ 連線失敗 (${res.status})`, detail: errorMsg };
    }
    return { ok: true, message: "✅ 連線成功 (Connection Verified)" };
  } catch (error: any) {
    return { ok: false, message: "❌ 網路錯誤 (Network Error)", detail: error.message };
  }
};

const parseVtonResult = (response: UniversalApiResponse): VTONResult => {
  const { content, images } = response;
  let finalImage = images.length > 0 ? images[0] : null;
  let analysisData = {
    comfort: "Analyzing... (Parse Failed)",
    weight: "Analyzing...",
    touch: "Analyzing...",
    breathability: "Analyzing...",
    scores: {
      comfort: 5, heaviness: 5, softness: 5, breathability: 5, elasticity: 5
    },
    rawText: content
  };
  if (!finalImage) {
    const imgMatch = content.match(/!\[.*?\]\((.*?)\)/);
    if (imgMatch) {
      finalImage = imgMatch[1];
    }
  }
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                      content.match(/```\s*([\s\S]*?)\s*```/) || 
                      content.match(/\{[\s\S]*\}/); 
    if (jsonMatch) {
      let jsonStr = jsonMatch[1] || jsonMatch[0];
      jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      const parsed = JSON.parse(jsonStr);
      analysisData = { 
        ...analysisData, 
        ...parsed,
        scores: { ...analysisData.scores, ...(parsed.scores || {}) }
      };
    }
  } catch (e) {
    console.warn("JSON Parse failed", e);
  }
  if (!finalImage) {
    throw new Error("Model returned text but NO image. Ensure the model has Vision/Image Generation capabilities.");
  }
  return { image: finalImage, analysis: analysisData };
};

export const generateVTON = async (
  provider: ProviderType,
  googleKey: string,
  googleModel: string,
  customConfig: CustomConfig,
  customPrompt: string,
  userImageBase64: string,
  userImageMime: string,
  garmentImageBase64: string,
  garmentImageMime: string,
  language: Language = 'zh-TW'
): Promise<VTONResult> => {
  const activeSystemPrompt = getSystemPrompt(language);
  let response: UniversalApiResponse;
  if (provider === 'google') {
    const parts: any[] = [
        { inlineData: { mimeType: userImageMime, data: userImageBase64 } },
        { text: "【輸入 A：使用者原圖 (User Image)】\n(CRITICAL: 保持臉部與身份特徵 100% 不變，僅更換服裝)" },
        { inlineData: { mimeType: garmentImageMime, data: garmentImageBase64 } },
        { text: "【輸入 B：目標服飾 (Garment Image)】" }
    ];
    if (customPrompt?.trim()) {
        parts.push({ text: `【使用者額外指令 (User Instruction)】: ${customPrompt}\n(再次強調：臉部必須保持原樣)` });
    }
    parts.push({ text: "開始生成高擬真試穿圖像 (Generate Photorealistic VTON Image)：" });
    response = await callGoogleSdk({
        apiKey: googleKey,
        model: googleModel || 'gemini-2.5-flash-image',
        parts: parts
    }, activeSystemPrompt);
  } else {
    const messages = [
        { role: "system", content: activeSystemPrompt },
        { 
          role: "user", 
          content: [
            { type: "text", text: `【任務】請根據以下兩張圖片生成 VTON 試穿結果。\n${customPrompt ? `額外指令: ${customPrompt}` : ""}` },
            { type: "image_url", image_url: { url: `data:${userImageMime};base64,${userImageBase64}` } },
            { type: "text", text: "【輸入A: 使用者 (保持臉部不變)】" },
            { type: "image_url", image_url: { url: `data:${garmentImageMime};base64,${garmentImageBase64}` } },
            { type: "text", text: "【輸入B: 服裝】" }
          ]
        }
    ];
    response = await callGenericServer({
        baseUrl: customConfig.baseUrl,
        apiKey: customConfig.apiKey,
        model: customConfig.modelName,
        messages: messages
    });
  }
  return parseVtonResult(response);
};

export const fileToBase64 = (file: File): Promise<string> => {
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

// ============================================================================
// PART 4: Components
// ============================================================================

const ImageUploadCard: React.FC<any> = ({
  id,
  label,
  subLabel,
  image,
  onUpload,
  onRemove,
  disabled = false,
  className = "",
  texts
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
                <span className="text-accent">{texts.clickToUpload}</span> {texts.dragDrop}
              </p>
              <p className="text-[10px] text-coffee/50 dark:text-warm-text/50">JPG, PNG (Max 10MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProcessingOverlay: React.FC<any> = ({ status, language }) => {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const t = translations[language as Language];
  const phases = [
    { id: AppStatus.ANALYZING, ...t.phases[AppStatus.ANALYZING] },
    { id: AppStatus.WARPING, ...t.phases[AppStatus.WARPING] },
    { id: AppStatus.COMPOSITING, ...t.phases[AppStatus.COMPOSITING] },
    { id: AppStatus.RENDERING, ...t.phases[AppStatus.RENDERING] },
  ];
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
          <h3 className="text-xl font-bold text-coffee dark:text-white mb-2 font-display tracking-tight">{t.appTitle} Engine</h3>
          <p className="text-coffee/60 dark:text-warm-text/60 text-sm mb-8">{language === 'zh-TW' ? '正在合成虛擬試穿效果...' : 'Synthesizing VTON results...'}</p>
          <div className="w-full space-y-4">
            {phases.map((phase, index) => {
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

const RadarChart = ({ scores, t }: { scores: any, t: any }) => {
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const metrics = [
    { key: 'comfort', label: t.result.metrics.comfort },
    { key: 'breathability', label: t.result.metrics.breathability },
    { key: 'softness', label: t.result.metrics.touch },
    { key: 'elasticity', label: t.result.metrics.elasticity },
    { key: 'heaviness', label: t.result.metrics.weight },
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
    <div className="relative flex justify-center py-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {webs.map((pointsStr, i) => (
          <polygon key={i} points={pointsStr} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
        ))}
        {axes.map((axis, i) => (
          <line key={i} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
        ))}
        <polygon points={points} fill="rgba(99, 102, 241, 0.4)" stroke="#6366f1" strokeWidth="2" className="drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
        {labels.map((l, i) => (
          <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fill="currentColor" className="text-[10px] font-mono tracking-wider opacity-60">
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
      <div className={`h-full rounded-full transition-all duration-1000 ${colorClass.replace('text-', 'bg-')}`} style={{ width: `${value * 10}%` }} />
    </div>
  </div>
);

const ResultView: React.FC<any> = ({ result, onClose, language }) => {
  const t = translations[language as Language];
  const scores = result.analysis?.scores || {
    comfort: 5, heaviness: 5, softness: 5, breathability: 5, elasticity: 5
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
      <div className="flex-1 w-full max-w-2xl flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4 text-accent font-medium uppercase tracking-widest text-xs">
          <ChevronDown size={14} className="animate-bounce" />
          {t.result.title}
        </div>
        <div className="relative w-full group">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-coffee/10 dark:border-white/20 bg-sand dark:bg-charcoal">
            <img src={result.image} alt="Virtual Try-On Result" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
              <div className="flex gap-3 justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <button onClick={handleDownload} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors shadow-lg shadow-black/20">
                  <Download size={18} />
                  {t.result.download}
                </button>
                <button onClick={() => window.open(result.image, '_blank')} className="p-2.5 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white/20 transition-colors" title="View full size">
                  <Maximize2 size={18} />
                </button>
              </div>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-red-500/80 backdrop-blur-md text-white rounded-full transition-all border border-white/10" title="Close">
              <X size={16} />
            </button>
          </div>
          <div className="absolute -inset-1 bg-gradient-to-r from-accent to-purple-600 rounded-2xl blur opacity-20 -z-10 group-hover:opacity-40 transition-opacity duration-500"></div>
        </div>
      </div>
      <div className="w-full xl:w-[400px] shrink-0">
        <div className="bg-sand/80 dark:bg-charcoal/50 border border-coffee/10 dark:border-white/10 rounded-2xl p-6 backdrop-blur-md sticky top-24 shadow-xl transition-colors duration-500 text-coffee dark:text-warm-text">
          <div className="flex items-center gap-2 mb-6 border-b border-coffee/10 dark:border-white/10 pb-4">
            <Activity className="text-accent" size={20} />
            <h3 className="font-display font-bold text-coffee dark:text-white tracking-wide">{t.result.hapticsTitle}</h3>
            <span className="text-[10px] bg-accent/10 dark:bg-accent/20 text-accent px-2 py-0.5 rounded ml-auto border border-accent/20">{t.result.dataVis}</span>
          </div>
          <div className="mb-8 bg-white/40 dark:bg-black/20 rounded-xl border border-coffee/5 dark:border-white/5 p-2">
            <div className="text-center text-[10px] text-coffee/50 dark:text-warm-text/50 uppercase tracking-widest mb-1">{t.result.profile}</div>
            <RadarChart scores={scores} t={t} />
          </div>
          <div className="space-y-6">
            <div className="group">
              <MetricBar label={t.result.metrics.comfort} value={scores.comfort || 5} colorClass="text-yellow-600 dark:text-yellow-400" icon={Sparkles} />
              <p className="text-sm text-coffee/70 dark:text-warm-text/70 leading-relaxed pl-1 text-justify">{result.analysis?.comfort}</p>
            </div>
            <div className="group border-t border-coffee/10 dark:border-white/5 pt-4">
              <MetricBar label={t.result.metrics.breathability} value={scores.breathability || 5} colorClass="text-green-600 dark:text-green-400" icon={Wind} />
              <p className="text-sm text-coffee/70 dark:text-warm-text/70 leading-relaxed pl-1 text-justify">{result.analysis?.breathability}</p>
            </div>
            <div className="group border-t border-coffee/10 dark:border-white/5 pt-4">
               <MetricBar label={t.result.metrics.touch} value={scores.softness || 5} colorClass="text-pink-600 dark:text-pink-400" icon={HandMetal} />
              <p className="text-sm text-coffee/70 dark:text-warm-text/70 leading-relaxed pl-1 text-justify">{result.analysis?.touch}</p>
            </div>
            <div className="group border-t border-coffee/10 dark:border-white/5 pt-4">
               <MetricBar label={t.result.metrics.weight} value={scores.heaviness || 5} colorClass="text-blue-600 dark:text-blue-400" icon={Scale} />
              <p className="text-sm text-coffee/70 dark:text-warm-text/70 leading-relaxed pl-1 text-justify">{result.analysis?.weight}</p>
            </div>
            <div className="group border-t border-coffee/10 dark:border-white/5 pt-4">
               <MetricBar label={t.result.metrics.elasticity} value={scores.elasticity || 5} colorClass="text-purple-600 dark:text-purple-400" icon={Zap} />
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

// ============================================================================
// PART 5: App Component
// ============================================================================

const SettingsModal: React.FC<any> = ({
  isOpen,
  onClose,
  provider,
  setProvider,
  googleApiKey,
  setGoogleApiKey,
  googleModelName,
  setGoogleModelName,
  customConfig,
  setCustomConfig,
  language
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [testDetail, setTestDetail] = useState<string | undefined>('');
  
  const t = translations[language as Language];

  useEffect(() => {
    setTestStatus('idle');
    setTestMessage('');
    setTestDetail('');
  }, [customConfig.baseUrl, customConfig.apiKey, customConfig.modelName]);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage(t.settings.testing);
    setTestDetail('');
    const result = await testCustomConnection(customConfig);
    setTestStatus(result.ok ? 'success' : 'error');
    setTestMessage(result.ok ? t.settings.testSuccess : t.settings.testFail);
    setTestDetail(result.detail || result.message);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-paper dark:bg-charcoal border border-coffee/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-coffee/5 dark:border-white/5 flex items-center justify-between bg-sand/50 dark:bg-black/20">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-accent" />
            <h2 className="font-bold text-coffee dark:text-white text-lg font-display">{t.settings.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-coffee/10 dark:hover:bg-white/10 text-coffee/60 dark:text-warm-text/60 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-3">
             <label className="text-xs font-bold text-coffee/60 dark:text-warm-text/60 uppercase tracking-wider">{t.settings.provider}</label>
             <div className="flex bg-coffee/5 dark:bg-black/20 p-1 rounded-xl">
                <button onClick={() => setProvider('google')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${provider === 'google' ? 'bg-white dark:bg-obsidian text-accent shadow-sm' : 'text-coffee/50 dark:text-warm-text/50 hover:text-coffee dark:hover:text-warm-text'}`}>Google Gemini</button>
                <button onClick={() => setProvider('custom')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${provider === 'custom' ? 'bg-white dark:bg-obsidian text-accent shadow-sm' : 'text-coffee/50 dark:text-warm-text/50 hover:text-coffee dark:hover:text-warm-text'}`}>Custom / OpenAI</button>
             </div>
          </div>
          {provider === 'google' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
               <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-coffee/60 dark:text-warm-text/60 uppercase tracking-wider">{t.settings.apiKey}</label>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent hover:underline flex items-center gap-1">{t.settings.getKey} <ExternalLink size={10} /></a>
                  </div>
                  <div className="bg-white dark:bg-obsidian border border-coffee/10 dark:border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2 focus-within:ring-1 focus-within:ring-accent/50 focus-within:border-accent/50 transition-all">
                     <Key size={16} className={googleApiKey ? 'text-green-500' : 'text-coffee/30 dark:text-warm-text/30'} />
                     <input type={showApiKey ? "text" : "password"} value={googleApiKey} onChange={setGoogleApiKey} placeholder="AIza..." className="bg-transparent border-none outline-none flex-1 text-sm text-coffee dark:text-warm-text font-mono placeholder-coffee/30 dark:placeholder-warm-text/30" />
                     <button onClick={() => setShowApiKey(!showApiKey)} className="text-coffee/40 dark:text-warm-text/40 hover:text-coffee dark:hover:text-warm-text">{showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-coffee/60 dark:text-warm-text/60 uppercase tracking-wider">{t.settings.modelSelect}</label>
                  <div className="bg-white dark:bg-obsidian border border-coffee/10 dark:border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2">
                     <Box size={16} className="text-coffee/30 dark:text-warm-text/30" />
                     <select value={googleModelName} onChange={(e) => setGoogleModelName(e.target.value)} className="bg-transparent border-none outline-none w-full text-sm text-coffee dark:text-warm-text cursor-pointer [&>option]:text-black [&>option]:bg-white">
                        <option value="gemini-2.5-flash-image">Flash 2.5 (Fast/Free)</option>
                        <option value="gemini-2.0-flash-exp">Flash 2.0 (Experimental)</option>
                        <option value="gemini-3-pro-image-preview">Pro 3 (High Res)</option>
                     </select>
                  </div>
                  <p className="text-[10px] text-coffee/50 dark:text-warm-text/50 px-1">{t.settings.modelHint}</p>
               </div>
            </div>
          )}
          {provider === 'custom' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
                   <p className="text-[10px] text-blue-800 dark:text-blue-200 leading-relaxed">{t.settings.customHint}</p>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-coffee/60 dark:text-warm-text/60 uppercase tracking-wider flex items-center gap-1"><Globe size={12} /> {t.settings.baseUrl}</label>
                   <input type="text" value={customConfig.baseUrl} onChange={(e) => setCustomConfig('baseUrl', e.target.value)} placeholder="https://free.v36.cm/v1" className="w-full bg-white dark:bg-obsidian border border-coffee/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-coffee dark:text-warm-text font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50" />
                   <p className="text-[10px] text-coffee/50 dark:text-warm-text/50 pl-1">{t.settings.baseUrlHint}</p>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-coffee/60 dark:text-warm-text/60 uppercase tracking-wider flex items-center gap-1"><Key size={12} /> {t.settings.apiKey}</label>
                   <div className="relative">
                      <input type={showApiKey ? "text" : "password"} value={customConfig.apiKey} onChange={(e) => setCustomConfig('apiKey', e.target.value)} placeholder="sk-..." className="w-full bg-white dark:bg-obsidian border border-coffee/10 dark:border-white/10 rounded-xl px-3 py-2.5 pr-10 text-xs text-coffee dark:text-warm-text font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50" />
                      <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee/40 dark:text-warm-text/40 hover:text-coffee dark:hover:text-warm-text">{showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-coffee/60 dark:text-warm-text/60 uppercase tracking-wider flex items-center gap-1"><Server size={12} /> {t.settings.modelId}</label>
                   <input type="text" value={customConfig.modelName} onChange={(e) => setCustomConfig('modelName', e.target.value)} placeholder="e.g. gpt-4o, claude-3-5-sonnet" className="w-full bg-white dark:bg-obsidian border border-coffee/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-coffee dark:text-warm-text font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50" />
                </div>
                <div className="pt-2">
                   <button onClick={handleTestConnection} disabled={!customConfig.baseUrl || !customConfig.apiKey || !customConfig.modelName || testStatus === 'testing'} className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${testStatus === 'testing' ? 'bg-coffee/5 border-transparent text-coffee/50' : testStatus === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/20' : testStatus === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20' : 'bg-white dark:bg-white/5 border-coffee/10 dark:border-white/10 text-coffee/70 dark:text-warm-text/70 hover:bg-coffee/5 dark:hover:bg-white/10'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                      {testStatus === 'testing' ? (<><RefreshCw size={14} className="animate-spin" /><span>{t.settings.testing}</span></>) : testStatus === 'success' ? (<><CheckCircle size={14} /><span>{t.settings.testSuccess}</span></>) : testStatus === 'error' ? (<><AlertCircle size={14} /><span>{t.settings.testFail}</span></>) : (<><Wifi size={14} /><span>{t.settings.testConn}</span></>)}
                   </button>
                   {(testMessage || testDetail) && (
                      <div className={`mt-3 p-3 rounded-lg text-[11px] leading-relaxed border ${testStatus === 'success' ? 'bg-green-500/5 border-green-500/10 text-green-700 dark:text-green-300' : testStatus === 'error' ? 'bg-red-500/5 border-red-500/10 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                         <p className="font-bold">{testMessage}</p>
                         {testDetail && <p className="opacity-80 mt-1 font-mono break-all">{testDetail}</p>}
                      </div>
                   )}
                </div>
             </div>
          )}
        </div>
        <div className="p-4 bg-sand/30 dark:bg-black/20 border-t border-coffee/5 dark:border-white/5">
           <button onClick={onClose} className="w-full py-3 bg-gradient-to-r from-accent to-purple-600 hover:from-accent-glow hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2">
             <Check size={18} />
             <span>{t.settings.complete}</span>
           </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [language, setLanguage] = useState<Language>('zh-TW');
  const [provider, setProvider] = useState<ProviderType>('google');
  const [googleModelName, setGoogleModelName] = useState<string>('gemini-2.5-flash-image');
  const [googleApiKey, setGoogleApiKey] = useState<string>('');
  const [customConfig, setCustomConfig] = useState<CustomConfig>({
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    modelName: 'anthropic/claude-3.5-sonnet'
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [userImage, setUserImage] = useState<ImageFile | null>(null);
  const [garmentImage, setGarmentImage] = useState<ImageFile | null>(null);
  const [promptText, setPromptText] = useState<string>('');
  const [resultData, setResultData] = useState<VTONResult | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);
  const isGeneratingRef = useRef<boolean>(false);
  const t = translations[language];

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setGoogleApiKey(savedKey);
    const savedProvider = localStorage.getItem('doppl_provider');
    if (savedProvider === 'custom' || savedProvider === 'google') {
      setProvider(savedProvider as ProviderType);
    }
    const savedLang = localStorage.getItem('doppl_lang');
    if (savedLang === 'en' || savedLang === 'zh-TW') {
        setLanguage(savedLang as Language);
    }
    const savedCustom = localStorage.getItem('doppl_custom_config');
    if (savedCustom) {
      try {
        setCustomConfig(JSON.parse(savedCustom));
      } catch (e) {
        console.error("Failed to parse saved custom config");
      }
    }
    if (!savedKey && !localStorage.getItem('gemini_api_key')) {
       setTimeout(() => setIsSettingsOpen(true), 800);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'zh-TW' ? 'en' : 'zh-TW';
    setLanguage(newLang);
    localStorage.setItem('doppl_lang', newLang);
  };
  const handleGoogleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value.trim();
    setGoogleApiKey(newKey);
    localStorage.setItem('gemini_api_key', newKey);
  };
  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    localStorage.setItem('doppl_provider', newProvider);
  };
  const handleCustomConfigChange = (key: keyof CustomConfig, value: string) => {
    const newConfig = { ...customConfig, [key]: value };
    setCustomConfig(newConfig);
    localStorage.setItem('doppl_custom_config', JSON.stringify(newConfig));
  };
  const handleImageUpload = async (file: File, type: 'user' | 'garment') => {
    try {
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      const imageFile: ImageFile = { file, previewUrl, base64, mimeType: file.type };
      if (type === 'user') setUserImage(imageFile);
      else setGarmentImage(imageFile);
      setErrorMsg(null);
    } catch (err) {
      console.error("File processing error", err);
      setErrorMsg(t.errors.processFailed);
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
    if (provider === 'google' && !googleApiKey) {
      setIsSettingsOpen(true);
      setErrorMsg(t.errors.noKey);
      return;
    }
    if (provider === 'custom') {
      if (!customConfig.baseUrl || !customConfig.apiKey || !customConfig.modelName) {
        setIsSettingsOpen(true);
        setErrorMsg(t.errors.incompleteCustom);
        return;
      }
    }
    if (!userImage || !garmentImage) return;
    setErrorMsg(null);
    isGeneratingRef.current = true;
    const phasesPromise = simulatePhases();
    const generationPromise = generateVTON(
      provider,
      googleApiKey,
      googleModelName,
      customConfig,
      promptText,
      userImage.base64,
      userImage.mimeType,
      garmentImage.base64,
      garmentImage.mimeType,
      language
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
         setErrorMsg(t.errors.genFailed);
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
  const isProcessing = status !== AppStatus.IDLE && status !== AppStatus.COMPLETE && status !== AppStatus.ERROR;
  return (
    <div className={darkMode ? 'dark' : ''}>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        provider={provider}
        setProvider={handleProviderChange}
        googleApiKey={googleApiKey}
        setGoogleApiKey={handleGoogleKeyChange}
        googleModelName={googleModelName}
        setGoogleModelName={setGoogleModelName}
        customConfig={customConfig}
        setCustomConfig={handleCustomConfigChange}
        language={language}
      />
      <div className="min-h-screen transition-colors duration-500 bg-paper text-coffee dark:bg-obsidian dark:text-warm-text font-sans selection:bg-accent/30 selection:text-coffee dark:selection:text-warm-text pb-20">
        <ProcessingOverlay status={status} language={language} />
        <header className="fixed top-0 left-0 right-0 z-40 bg-paper/80 dark:bg-obsidian/80 backdrop-blur-md border-b border-coffee/5 dark:border-white/5 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-coffee dark:text-white hidden sm:block">Doppl-Next</span>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
               <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-coffee/40 dark:text-warm-text/40 bg-coffee/5 dark:bg-white/5 px-2 py-1 rounded-md">
                  <div className={`w-1.5 h-1.5 rounded-full ${provider === 'google' && googleApiKey ? 'bg-green-500' : provider === 'custom' && customConfig.apiKey ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                  {provider === 'google' ? 'Gemini' : 'Custom'}
               </div>
               <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full bg-coffee/5 dark:bg-white/5 hover:bg-coffee/10 dark:hover:bg-white/10 text-coffee dark:text-warm-text/80 transition-colors border border-transparent hover:border-coffee/10 dark:hover:border-white/10" title="Settings">
                  <Settings size={16} />
                  <span className="text-xs font-medium hidden md:inline">Settings</span>
               </button>
               <button onClick={toggleLanguage} className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-full bg-coffee/5 dark:bg-white/5 hover:bg-coffee/10 dark:hover:bg-white/10 text-coffee dark:text-warm-text/80 transition-colors" title="Switch Language">
                  <Languages size={16} />
                  <span className="text-xs font-medium w-6 text-center">{language === 'zh-TW' ? '繁' : 'EN'}</span>
               </button>
               <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-coffee/5 dark:hover:bg-white/10 transition-colors text-coffee dark:text-warm-text/80 active:scale-90" title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
               </button>
            </div>
          </div>
        </header>
        <main className="pt-24 px-4 md:px-6 max-w-7xl mx-auto flex flex-col items-center">
          {!resultData && (
            <div className="text-center space-y-4 max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-3xl md:text-5xl font-display font-bold text-coffee dark:text-white tracking-tight leading-tight">
                Gemini 3 Pro <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">{t.heroTitle}</span>
              </h1>
              <p className="text-coffee/70 dark:text-warm-text/70 text-base md:text-lg leading-relaxed px-4">{t.heroSubtitle}</p>
            </div>
          )}
          {resultData && (
            <div ref={resultSectionRef} className="w-full flex justify-center mb-8">
               <ResultView result={resultData} onClose={handleCloseResult} language={language} />
            </div>
          )}
          <div className="w-full max-w-4xl space-y-8">
            <div className="bg-sand/60 dark:bg-charcoal/30 border border-coffee/5 dark:border-white/5 rounded-3xl p-5 md:p-8 backdrop-blur-sm shadow-xl dark:shadow-none transition-colors duration-500">
              {errorMsg && (
                <div className="w-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-200 p-4 rounded-xl flex items-start gap-3 mb-8 animate-in fade-in slide-in-from-top-2 shadow-sm">
                  <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                  <p className="text-sm whitespace-pre-line leading-relaxed font-medium">{errorMsg}</p>
                </div>
              )}
              <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-8 relative">
                <ImageUploadCard id="user-upload" label={t.upload.userLabel} subLabel={t.upload.userSub} image={userImage} onUpload={(f: File) => handleImageUpload(f, 'user')} onRemove={() => setUserImage(null)} disabled={isProcessing} className="w-full md:flex-1 min-w-0" texts={t.upload} />
                <div className="md:hidden flex justify-center -my-4 z-10 pointer-events-none">
                   <div className="p-2 rounded-full bg-paper dark:bg-obsidian border border-coffee/10 dark:border-white/10 shadow-lg text-coffee/30 dark:text-warm-text/30">
                     <Settings size={16} className="rotate-90 opacity-0" />
                   </div>
                </div>
                <div className="hidden md:flex flex-col justify-center items-center text-coffee/30 dark:text-warm-text/30 px-2 shrink-0">
                  <div className="h-full w-px bg-gradient-to-b from-transparent via-coffee/10 dark:via-white/10 to-transparent absolute"></div>
                  <div className="p-3 border border-coffee/10 dark:border-white/10 rounded-full bg-paper dark:bg-obsidian z-10 shadow-xl transition-colors duration-500">
                    {isProcessing ? (<RefreshCw size={16} className="text-accent animate-spin" />) : (<div className="flex gap-2"><User size={16} className="text-coffee/40 dark:text-warm-text/40" /><Shirt size={16} className="text-coffee/40 dark:text-warm-text/40" /></div>)}
                  </div>
                </div>
                <ImageUploadCard id="garment-upload" label={t.upload.garmentLabel} subLabel={t.upload.garmentSub} image={garmentImage} onUpload={(f: File) => handleImageUpload(f, 'garment')} onRemove={() => setGarmentImage(null)} disabled={isProcessing} className="w-full md:flex-1 min-w-0" texts={t.upload} />
              </div>
              <div className="space-y-3">
                <label htmlFor="prompt-input" className="flex items-center gap-2 text-sm font-medium text-coffee/80 dark:text-warm-text/80 ml-1"><MessageSquare size={16} className="text-accent" />{resultData ? t.prompt.labelRefine : t.prompt.label}</label>
                <textarea id="prompt-input" value={promptText} onChange={(e) => setPromptText(e.target.value)} placeholder={resultData ? t.prompt.placeholderRefine : t.prompt.placeholder} className="w-full h-24 bg-white dark:bg-charcoal border border-coffee/10 dark:border-white/10 rounded-xl p-4 text-sm text-coffee dark:text-warm-text placeholder-coffee/40 dark:placeholder-warm-text/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all resize-none shadow-sm dark:shadow-none" disabled={isProcessing} />
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {resultData && (
                  <button onClick={fullReset} className="px-6 py-4 rounded-xl border border-coffee/10 dark:border-white/10 bg-white dark:bg-white/5 text-coffee/70 dark:text-warm-text/70 font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95" disabled={isProcessing}>
                    <Trash2 size={18} />
                    <span className="sm:hidden md:inline">{t.actions.reset}</span>
                  </button>
                )}
                <button onClick={handleGenerate} disabled={isProcessing || !userImage || !garmentImage} className={`flex-1 py-4 rounded-xl font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all duration-300 active:scale-95 ${(isProcessing || !userImage || !garmentImage) ? 'bg-gray-200 dark:bg-charcoal/50 text-gray-400 dark:text-white/30 cursor-not-allowed border border-transparent dark:border-white/5' : 'bg-gradient-to-r from-accent to-purple-600 hover:from-accent-glow hover:to-purple-500 text-white border border-transparent dark:border-white/10 hover:shadow-accent/40'}`}>
                  {isProcessing ? (<><RefreshCw className="animate-spin" size={20} /><span>{t.actions.processing}</span></>) : resultData ? (<><Sparkles size={20} /><span>{t.actions.regenerate}</span></>) : (<><Sparkles size={20} /><span>{provider === 'google' && !googleApiKey ? t.actions.setupKey : t.actions.generate}</span></>)}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// ============================================================================
// PART 6: Render
// ============================================================================

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
