export interface ImageFile {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING', // Semantic Analysis
  WARPING = 'WARPING',     // Physics-Based Warping
  COMPOSITING = 'COMPOSITING', // Composition & Inpainting
  RENDERING = 'RENDERING',   // Environmental Rendering
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
    // New numerical data for visualization
    scores: {
      comfort: number;      // 1-10
      heaviness: number;    // 1-10 (Weight)
      softness: number;     // 1-10 (Touch)
      breathability: number;// 1-10
      elasticity: number;   // 1-10 (Extra)
    };
    rawText: string;
  }
}

export const GENERATION_PHASES = [
  { id: AppStatus.ANALYZING, label: '第一階段：語意與材質分析', detail: '識別使用者姿勢，解析服裝布料物理屬性...' },
  { id: AppStatus.WARPING, label: '第二階段：物理模擬翹曲', detail: '建構 3D 體積，模擬重力與布料張力...' },
  { id: AppStatus.COMPOSITING, label: '第三階段：光場合成', detail: '處理遮擋、邊緣融合與細節修飾...' },
  { id: AppStatus.RENDERING, label: '第四階段：觸感推論與渲染', detail: '計算穿著舒適度數據並輸出最終影像...' },
];