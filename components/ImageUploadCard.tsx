import React, { useRef } from 'react';
import { ImageFile } from '../types';
import { Upload, X } from 'lucide-react';

interface ImageUploadCardProps {
  id: string;
  label: string;
  subLabel: string;
  image: ImageFile | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const ImageUploadCard: React.FC<ImageUploadCardProps> = ({
  id,
  label,
  subLabel,
  image,
  onUpload,
  onRemove,
  disabled = false,
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
    <div className="flex flex-col gap-3 flex-1 min-w-[300px]">
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} className="text-sm font-semibold text-coffee/80 dark:text-warm-text/80 uppercase tracking-wider font-display">
          {label}
        </label>
        <span className="text-xs text-coffee/50 dark:text-warm-text/50">{subLabel}</span>
      </div>

      <div
        className={`
          relative group flex flex-col items-center justify-center w-full aspect-[3/4] 
          rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden
          ${image 
            ? 'border-accent/50 bg-white dark:bg-charcoal' 
            : 'border-coffee/10 dark:border-white/10 bg-white/50 dark:bg-charcoal/50 hover:border-accent/30 dark:hover:border-white/20 hover:bg-white dark:hover:bg-charcoal/80'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-500/80 backdrop-blur-md rounded-full text-white transition-all"
              >
                <X size={16} />
              </button>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </>
        ) : (
          <div className="flex flex-col items-center text-center p-6 space-y-4">
            <div className="p-4 rounded-full bg-coffee/5 dark:bg-white/5 group-hover:bg-accent/10 transition-colors">
              <Upload size={24} className="text-coffee/40 dark:text-warm-text/40 group-hover:text-accent transition-colors" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-coffee dark:text-warm-text">
                <span className="text-accent">點擊上傳</span> 或拖放檔案
              </p>
              <p className="text-xs text-coffee/50 dark:text-warm-text/50">JPG, PNG (最大 10MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploadCard;