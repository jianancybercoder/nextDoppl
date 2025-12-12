import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Shirt, User, AlertTriangle, MessageSquare, Key, Eye, EyeOff, ExternalLink, RefreshCw, Trash2, Settings2, Sun, Moon, CreditCard, Info, ShieldAlert } from 'lucide-react';
import ImageUploadCard from './components/ImageUploadCard.tsx';
import ProcessingOverlay from './components/ProcessingOverlay.tsx';
import ResultView from './components/ResultView.tsx';
import { ImageFile, AppStatus, VTONResult } from './types.ts';
import { generateVTON, fileToBase64 } from './services/geminiService.ts';

const App: React.FC = () => {
  // Theme State - Default to Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Default to Flash Image as it is more likely to be available than Pro Preview
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

  // Load API key from local storage
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Save API key when changed
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value.trim(); // Auto trim
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

    // Start phases visual
    const phasesPromise = simulatePhases();
    
    // Start generation
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
      // Wait for both animation and generation
      const [_, result] = await Promise.all([phasesPromise, generationPromise]);
      
      if (isGeneratingRef.current) {
        setResultData(result);
        setStatus(AppStatus.COMPLETE);
        
        // Auto scroll to result after short delay
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

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-paper/80 dark:bg-obsidian/80 backdrop-blur-md border-b border-coffee/5 dark:border-white/5 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-coffee dark:text-white">Doppl-Next</span>
            </div>
            <div className="flex items-center gap-4">
              
               {/* Model Selector */}
               <div className="flex items-center gap-3 text-xs font-mono text-coffee/70 dark:text-warm-text/70 bg-sand dark:bg-white/5 px-3 py-1.5 rounded-full border border-coffee/10 dark:border-white/5 transition-colors">
                  <Settings2 size={12} />
                  <select 
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="bg-transparent border-none outline-none text-coffee dark:text-warm-text cursor-pointer max-w-[150px] md:max-w-none truncate [&>option]:text-black [&>option]:bg-white"
                    disabled={isProcessing}
                  >
                    <option value="gemini-2.5-flash-image">Flash 2.5 (Standard)</option>
                    <option value="gemini-2.0-flash-exp">Flash 2.0 (Experimental)</option>
                    <option value="gemini-3-pro-image-preview">Pro 3 (High Res)</option>
                  </select>
               </div>

               {/* Theme Toggle */}
               <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-full hover:bg-coffee/5 dark:hover:bg-white/10 transition-colors text-coffee dark:text-warm-text/80"
                  title={darkMode ? "切換亮色模式" : "切換暗色模式"}
               >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
               </button>

               <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-coffee/60 dark:text-warm-text/60">
                  <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'} shadow-[0_0_8px_rgba(34,197,94,0.4)]`}></span>
                  ONLINE
               </div>
            </div>
          </div>
        </header>

        <main className="pt-24 px-6 max-w-7xl mx-auto flex flex-col items-center">
          
          {!resultData && (
            <div className="text-center space-y-4 max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-3xl md:text-5xl font-display font-bold text-coffee dark:text-white tracking-tight leading-tight">
                Gemini 3 Pro <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">真實物理 VTON 引擎</span>
              </h1>
              <p className="text-coffee/70 dark:text-warm-text/70 text-lg leading-relaxed">
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
            
            <div className="bg-sand/60 dark:bg-charcoal/30 border border-coffee/5 dark:border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-xl dark:shadow-none transition-colors duration-500">
              
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
                
                {/* Critical Billing Warning */}
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-red-700 dark:text-red-300">
                        ⚠️ 關於費用與免費層級 (Billing Alert)
                      </p>
                      <p className="text-xs text-red-700/80 dark:text-red-300/80 leading-relaxed">
                        請務必確認您的 Google AI Studio 專案處於 <strong>「Free of Charge (免費)」</strong> 狀態。
                        <br/><br/>
                        若您在綁定卡片後啟用了 <strong>「Pay-as-you-go (即用即付)」</strong>，Google 將會對生成的圖片進行收費。如果您看到 Google Cloud 有費用產生，請立即：
                        <ol className="list-decimal pl-4 mt-1 space-y-1">
                          <li>前往 Google Cloud Console <strong>停用計費 (Disable Billing)</strong> 以停止扣款。</li>
                          <li>聯絡 Google Billing Support 說明是誤操作，通常可申請退款 (Refund)。</li>
                        </ol>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 mt-3 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
                  <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-coffee/70 dark:text-warm-text/70 leading-relaxed">
                    <strong>正常使用：</strong> 在 AI Studio 預設的 "Free Tier" 下，若達到上限會顯示 429 錯誤（停止服務），<strong>不會扣款</strong>。只有當您手動升級計畫後，才會產生費用。
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="w-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-200 p-4 rounded-xl flex items-start gap-3 mb-8 animate-in fade-in slide-in-from-top-2 shadow-sm">
                  <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                  <p className="text-sm whitespace-pre-line leading-relaxed font-medium">{errorMsg}</p>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-6 mb-8">
                <ImageUploadCard
                  id="user-upload"
                  label="目標使用者"
                  subLabel="全身或半身照片"
                  image={userImage}
                  onUpload={(f) => handleImageUpload(f, 'user')}
                  onRemove={() => setUserImage(null)}
                  disabled={isProcessing}
                />

                <div className="hidden md:flex flex-col justify-center items-center text-coffee/30 dark:text-warm-text/30 px-2">
                  <div className="h-full w-px bg-gradient-to-b from-transparent via-coffee/10 dark:via-white/10 to-transparent absolute"></div>
                  <div className="p-3 border border-coffee/10 dark:border-white/10 rounded-full bg-paper dark:bg-obsidian z-10 shadow-xl transition-colors duration-500">
                    {isProcessing ? (
                       <RefreshCw size={16} className="text-accent animate-spin" />
                    ) : (
                       <div className="flex gap-2">
                         <User size={16} className="text-coffee/40 dark:text-warm-text/40" />
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
                />
              </div>

              <div className="space-y-3">
                <label htmlFor="prompt-input" className="flex items-center gap-2 text-sm font-medium text-coffee/80 dark:text-warm-text/80 ml-1">
                  <MessageSquare size={16} className="text-accent" />
                  {resultData ? '微調需求 / 追加指令 (Refinement)' : '詳細微調需求 (選填)'}
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

              <div className="mt-8 flex gap-4">
                {resultData && (
                  <button
                    onClick={fullReset}
                    className="px-6 py-4 rounded-xl border border-coffee/10 dark:border-white/10 bg-white dark:bg-white/5 text-coffee/70 dark:text-warm-text/70 font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    disabled={isProcessing}
                  >
                    <Trash2 size={18} />
                    清除重來
                  </button>
                )}
                
                <button
                  onClick={handleGenerate}
                  disabled={isProcessing || !apiKey || !userImage || !garmentImage}
                  className={`
                    flex-1 py-4 rounded-xl font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-accent/20
                    transition-all duration-300
                    ${(isProcessing || !apiKey || !userImage || !garmentImage)
                      ? 'bg-gray-200 dark:bg-charcoal/50 text-gray-400 dark:text-white/30 cursor-not-allowed border border-transparent dark:border-white/5' 
                      : 'bg-gradient-to-r from-accent to-purple-600 hover:from-accent-glow hover:to-purple-500 text-white border border-transparent dark:border-white/10 hover:shadow-accent/40'}
                  `}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} />
                      <span>ENGINE PROCESSING...</span>
                    </>
                  ) : resultData ? (
                    <>
                      <Sparkles size={20} />
                      <span>依據新設定重新生成 (Re-Generate)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>啟動 VTON 引擎 (Generate)</span>
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

export default App;