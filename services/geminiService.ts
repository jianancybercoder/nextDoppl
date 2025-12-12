import { GoogleGenAI } from "@google/genai";
import { VTONResult } from "../types.ts";

const SYSTEM_PROMPT = `
你是由 Google Gemini 模型驅動的頂尖 "Doppl-Next VTON Engine" (高保真虛擬試穿引擎)。
你的任務有兩個：
1. 生成 **8K 解析度、攝影級真實感** 的虛擬試穿圖像。
2. 提供一份 **「虛擬觸感報告 (Phantom Haptics Report)」**，包含文字分析與**量化數據**。

# 任務 1：圖像生成規則
- **絕對真實感**：拒絕塑膠感。保留皮膚毛孔、布料織紋與微小瑕疵。
- **物理垂墜**：根據地心引力模擬布料下垂、堆積與張力皺褶。
- **身份保留**：[使用者圖像] 的臉部必須 **100% 鎖定**，不可改變五官或表情。
- **層次正確**：長髮與手部必須正確地遮擋或被遮擋。

# 任務 2：觸感分析規則 (必須以 JSON 格式回傳於文字回應中)
請根據視覺生成的結果，推論穿著體驗，並給予 1-10 的評分。

回傳的 JSON 格式必須包含以下結構：
\`\`\`json
{
  "comfort": "文字描述 (例如：柔軟親膚...)",
  "weight": "文字描述 (例如：布料厚實具垂墜感...)",
  "touch": "文字描述 (例如：絲滑涼爽...)",
  "breathability": "文字描述 (例如：網眼結構透氣佳...)",
  "scores": {
    "comfort": 8,       // 舒適度: 1(不適/刺癢) - 10(極致舒適)
    "heaviness": 6,     // 重量感: 1(極輕/飄逸) - 10(厚重/硬挺)
    "softness": 9,      // 柔軟度(觸感): 1(粗糙/硬) - 10(絲滑/軟)
    "breathability": 7, // 透氣度: 1(悶熱/不透風) - 10(極透氣/涼感)
    "elasticity": 5     // 彈性: 1(無彈/緊繃) - 10(超高彈力)
  }
}
\`\`\`
`;

export const generateVTON = async (
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
    throw new Error("API Key 格式似乎不正確 (應以 'AIza' 開頭)。請檢查是否複製完整。");
  }

  // Use flash-image as default fallback
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
        text: `【使用者額外指令】: ${customPrompt}` 
      });
    }

    parts.push({ text: "開始生成試穿圖像與詳細 JSON 數據分析：" });

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: {
        parts: parts,
      },
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
      throw new Error(`模型生成失敗，未返回圖像數據。請嘗試更換模型或圖片。文字回應: ${textAnalysis.substring(0, 100)}...`);
    }

    // Default structure in case parsing fails
    let analysisData = {
      comfort: "分析中...",
      weight: "分析中...",
      touch: "分析中...",
      breathability: "分析中...",
      scores: {
        comfort: 5,
        heaviness: 5,
        softness: 5,
        breathability: 5,
        elasticity: 5
      },
      rawText: textAnalysis
    };

    try {
      const jsonMatch = textAnalysis.match(/```json\s*([\s\S]*?)\s*```/) || textAnalysis.match(/{[\s\S]*}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        // Merge parsed data with default structure to ensure scores object exists
        analysisData = { 
          ...analysisData, 
          ...parsed,
          scores: { ...analysisData.scores, ...(parsed.scores || {}) }
        };
      }
    } catch (e) {
      console.warn("Failed to parse haptics JSON", e);
    }

    return {
      image: imageBase64,
      analysis: analysisData
    };

  } catch (error: any) {
    console.error("Gemini VTON Generation Error:", error);
    
    const errorMessage = error.message || '';

    // Detailed error handling for user
    if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
      throw new Error(
        `權限不足 (403)。\n` +
        `1. 請確保 API Key 正確。\n` +
        `2. 圖片生成模型需要您的 Google Cloud 專案**綁定帳單 (Set up billing)** 進行驗證才能啟用。驗證後即可使用 Free Tier 免費額度。`
      );
    }
    
    // Google often returns 429 for "Free Tier" users trying to use Image models without Billing set up.
    if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      throw new Error(
        `額度驗證 (429/Quota)。\n` +
        `Google 要求使用「圖片生成」功能必須**綁定帳單 (Set up billing)** 以驗證身份。\n` +
        `請放心，綁定後只要在免費額度內（通常每日 1500 次）使用，**完全免費**。`
      );
    }
    
    if (errorMessage.includes('400')) {
        throw new Error("請求無效 (400)。可能是圖片格式不支援、圖片過大，或是該模型暫時不支援此區域。");
    }
    
    throw error;
  }
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