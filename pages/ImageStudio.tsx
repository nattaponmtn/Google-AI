import React, { useState, useRef } from 'react';
import { editMaintenanceImage } from '../services/geminiService';
import { Wand2, Download, Upload, Loader2, ArrowRight, Undo2 } from 'lucide-react';

export const ImageStudio: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setOriginalImage(reader.result as string);
      setGeneratedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!originalImage || !prompt) return;

    setIsProcessing(true);
    try {
      const mimeType = originalImage.split(';')[0].split(':')[1];
      const base64Data = originalImage.split(',')[1];
      const resultBase64 = await editMaintenanceImage(base64Data, mimeType, prompt);
      // Assuming result is compatible with PNG for display
      setGeneratedImage(`data:image/png;base64,${resultBase64}`);
    } catch (error) {
      console.error("Image edit failed", error);
      alert("Failed to edit image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Image Studio</h2>
            <p className="text-slate-500">Edit images using text prompts with Gemini Nano Banana</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Prompt Input */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-3 text-slate-400">
              <Wand2 size={20} />
            </div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how to change the image (e.g., 'Highlight the safety valve in red', 'Remove the person')"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!originalImage || !prompt || isProcessing}
            className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <SparklesIcon />}
            Generate
          </button>
        </div>

        {/* Canvas Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Original */}
            <div className="space-y-3">
                <h3 className="font-semibold text-slate-700">Original</h3>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`aspect-video rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-purple-400 bg-slate-50 overflow-hidden relative ${!originalImage ? 'p-8' : ''}`}
                >
                    <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleUpload} />
                    {originalImage ? (
                        <img src={originalImage} alt="Original" className="w-full h-full object-contain" />
                    ) : (
                        <div className="text-center text-slate-500">
                            <Upload className="mx-auto mb-2" />
                            <p>Upload Image</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Result */}
            <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 flex justify-between">
                    Generated Result
                    {generatedImage && (
                        <a href={generatedImage} download="edited_maintenance.png" className="text-purple-600 text-sm flex items-center gap-1 hover:underline">
                            <Download size={14} /> Save
                        </a>
                    )}
                </h3>
                <div className="aspect-video rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative">
                    {isProcessing ? (
                        <div className="flex flex-col items-center text-purple-600">
                            <Loader2 className="animate-spin mb-2" size={32} />
                            <span className="text-sm font-medium">Applying edits...</span>
                        </div>
                    ) : generatedImage ? (
                        <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                    ) : (
                        <div className="text-center text-slate-400 text-sm p-8">
                            <ArrowRight className="mx-auto mb-2" />
                            <p>Result will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.9375 15.5L12 21L14.0625 15.5L19.5 13.4375L14.0625 11.375L12 5.875L9.9375 11.375L4.5 13.4375L9.9375 15.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
