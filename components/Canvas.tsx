/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { RotateCcwIcon, ChevronLeftIcon, ChevronRightIcon, SmileIcon, DownloadIcon, EditIcon, ImageIcon, PaletteIcon, UploadCloudIcon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';
import { OutfitLayer } from '../types';

interface CanvasProps {
  displayImageUrl: string | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (instruction: string) => void;
  poseInstructions: string[];
  currentPoseInstruction: string;
  availablePoseKeys: string[];
  onSelectEmotion: (instruction: string) => void;
  emotionInstructions: string[];
  currentEmotionInstruction: string;
  onSelectBackground: (instruction: string) => void;
  onUploadBackground: (file: File) => void;
  backgroundInstructions: string[];
  currentBackgroundInstruction: string;
  onSelectColor: (instruction: string) => void;
  colorInstructions: string[];
  currentColorInstruction: string;
  activeOutfitLayer: OutfitLayer | undefined;
  currentOutfitIndex: number;
}

const Canvas: React.FC<CanvasProps> = ({ 
  displayImageUrl, 
  onStartOver, 
  isLoading, 
  loadingMessage, 
  onSelectPose, 
  poseInstructions, 
  currentPoseInstruction, 
  availablePoseKeys,
  onSelectEmotion,
  emotionInstructions,
  currentEmotionInstruction,
  onSelectBackground,
  onUploadBackground,
  backgroundInstructions,
  currentBackgroundInstruction,
  onSelectColor,
  colorInstructions,
  currentColorInstruction,
  activeOutfitLayer,
  currentOutfitIndex,
}) => {
  const [isPoseMenuOpen, setIsPoseMenuOpen] = useState(false);
  const [customPose, setCustomPose] = useState('');
  const [isEmotionMenuOpen, setIsEmotionMenuOpen] = useState(false);
  const [customEmotion, setCustomEmotion] = useState('');
  const [isBackgroundMenuOpen, setIsBackgroundMenuOpen] = useState(false);
  const [customBackground, setCustomBackground] = useState('');
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  
  const handleDownload = () => {
    if (!displayImageUrl) return;
    const link = document.createElement('a');
    link.href = displayImageUrl;
    const garmentName = activeOutfitLayer?.garment?.name.replace(/\s+/g, '-') || 'model';
    const poseName = currentPoseInstruction.replace(/\s+/g, '-').slice(0, 20);
    const emotionName = currentEmotionInstruction.replace(/\s+/g, '-');
    const backgroundName = currentBackgroundInstruction.replace(/\s+/g, '-').slice(0,20);
    const colorName = currentColorInstruction.replace(/\s+/g, '-');
    link.download = `vto-${garmentName}-${poseName}-${emotionName}-${backgroundName}-${colorName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleCustomPoseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPose.trim() && !isLoading) {
      onSelectPose(customPose.trim());
      setCustomPose('');
      setIsPoseMenuOpen(false);
    }
  };

  const handleCustomEmotionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customEmotion.trim() && !isLoading) {
      onSelectEmotion(customEmotion.trim());
      setCustomEmotion('');
      setIsEmotionMenuOpen(false);
    }
  };

  const handleCustomBackgroundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customBackground.trim() && !isLoading) {
      onSelectBackground(customBackground.trim());
      setCustomBackground('');
      setIsBackgroundMenuOpen(false);
    }
  };
  
  const handleBackgroundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadBackground(e.target.files[0]);
      setIsBackgroundMenuOpen(false);
    }
  };

  const handlePreviousPose = () => {
    if (isLoading || availablePoseKeys.length <= 1) return;
    const currentIndex = availablePoseKeys.indexOf(currentPoseInstruction);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + availablePoseKeys.length) % availablePoseKeys.length;
    onSelectPose(availablePoseKeys[prevIndex]);
  };

  const handleNextPose = () => {
    if (isLoading || availablePoseKeys.length <= 1) return;
    const currentIndex = availablePoseKeys.indexOf(currentPoseInstruction);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % availablePoseKeys.length;
    onSelectPose(availablePoseKeys[nextIndex]);
  };
  
  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative animate-zoom-in group">
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <button 
            onClick={onStartOver}
            className="flex items-center justify-center text-center bg-white/60 border border-gray-300/80 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-white hover:border-gray-400 active:scale-95 text-sm backdrop-blur-sm"
            aria-label="Start over"
        >
            <RotateCcwIcon className="w-4 h-4 mr-2" />
            Start Over
        </button>
      </div>

      <div className="absolute top-4 right-4 z-30">
          <button 
            onClick={handleDownload}
            className="flex items-center justify-center text-center bg-white/60 border border-gray-300/80 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-white hover:border-gray-400 active:scale-95 text-sm backdrop-blur-sm"
            aria-label="Download image"
            disabled={!displayImageUrl || isLoading}
          >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Download
          </button>
      </div>


      {/* Image Display or Placeholder */}
      <div className="relative w-full h-full flex items-center justify-center">
        {displayImageUrl ? (
          <img
            key={displayImageUrl} // Use key to force re-render and trigger animation on image change
            src={displayImageUrl}
            alt="Virtual try-on model"
            className="max-w-full max-h-full object-contain transition-opacity duration-500 animate-fade-in rounded-lg"
          />
        ) : (
            <div className="w-[400px] h-[600px] bg-gray-100 border border-gray-200 rounded-lg flex flex-col items-center justify-center">
              <Spinner />
              <p className="text-md font-serif text-gray-600 mt-4">Loading Model...</p>
            </div>
        )}
        
        <AnimatePresence>
          {isLoading && (
              <motion.div
                  className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <Spinner />
                  {loadingMessage && (
                      <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">{loadingMessage}</p>
                  )}
              </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      {displayImageUrl && !isLoading && (
        <div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <div className="flex items-end gap-2">
            {/* Pose Controls */}
            <div className="relative">
              <AnimatePresence>
                  {isPoseMenuOpen && (
                      <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="absolute bottom-full mb-3 w-72 bg-white/80 backdrop-blur-lg rounded-xl p-2 border border-gray-200/80 shadow-lg"
                      >
                          <div className="grid grid-cols-2 gap-2 p-1">
                              {poseInstructions.map((pose) => (
                                  <button
                                      key={pose}
                                      onClick={() => { onSelectPose(pose); setIsPoseMenuOpen(false); }}
                                      disabled={isLoading || pose === currentPoseInstruction}
                                      className="w-full text-left text-sm font-medium text-gray-800 p-2 rounded-md hover:bg-gray-200/70 disabled:opacity-50 disabled:bg-gray-200/70 disabled:font-bold disabled:cursor-not-allowed"
                                  >
                                      {pose}
                                  </button>
                              ))}
                          </div>
                          <form onSubmit={handleCustomPoseSubmit} className="p-2 border-t border-gray-200/80">
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Custom Pose</label>
                            <input
                              type="text"
                              value={customPose}
                              onChange={(e) => setCustomPose(e.target.value)}
                              placeholder="e.g., dancing happily"
                              className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-gray-800"
                            />
                          </form>
                      </motion.div>
                  )}
              </AnimatePresence>
              
              <div className="flex items-center justify-center gap-1 bg-white/60 backdrop-blur-md rounded-full p-2 border border-gray-300/50">
                <button 
                  onClick={handlePreviousPose}
                  aria-label="Previous pose"
                  className="p-2 rounded-full hover:bg-white/80 active:scale-90 transition-all disabled:opacity-50"
                  disabled={isLoading || availablePoseKeys.length <= 1}
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-800" />
                </button>
                <button 
                  onClick={() => setIsPoseMenuOpen(!isPoseMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/80"
                >
                  <span className="text-sm font-semibold text-gray-800 w-40 text-center truncate" title={currentPoseInstruction}>
                    {currentPoseInstruction}
                  </span>
                  <EditIcon className="w-4 h-4 text-gray-600"/>
                </button>
                <button 
                  onClick={handleNextPose}
                  aria-label="Next pose"
                  className="p-2 rounded-full hover:bg-white/80 active:scale-90 transition-all disabled:opacity-50"
                  disabled={isLoading || availablePoseKeys.length <= 1}
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-800" />
                </button>
              </div>
            </div>

            {/* Emotion Controls */}
            <div className="relative">
              <AnimatePresence>
                {isEmotionMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute bottom-full mb-3 w-56 bg-white/80 backdrop-blur-lg rounded-xl p-2 border border-gray-200/80 shadow-lg"
                  >
                    <div className="grid grid-cols-2 gap-2 p-1">
                      {emotionInstructions.map((emotion) => (
                        <button
                          key={emotion}
                          onClick={() => { onSelectEmotion(emotion); setIsEmotionMenuOpen(false); }}
                          disabled={isLoading || emotion === currentEmotionInstruction}
                          className="w-full text-left text-sm font-medium text-gray-800 p-2 rounded-md hover:bg-gray-200/70 disabled:opacity-50 disabled:bg-gray-200/70 disabled:font-bold disabled:cursor-not-allowed"
                        >
                          {emotion}
                        </button>
                      ))}
                    </div>
                     <form onSubmit={handleCustomEmotionSubmit} className="p-2 border-t border-gray-200/80">
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Custom Emotion</label>
                        <input
                          type="text"
                          value={customEmotion}
                          onChange={(e) => setCustomEmotion(e.target.value)}
                          placeholder="e.g., surprised"
                          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-gray-800"
                        />
                      </form>
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                onClick={() => setIsEmotionMenuOpen(!isEmotionMenuOpen)}
                className="flex items-center justify-center bg-white/60 backdrop-blur-md rounded-full p-4 border border-gray-300/50" 
                title={`Change emotion: ${currentEmotionInstruction}`}
                aria-label="Change emotion"
              >
                <SmileIcon className="w-5 h-5 text-gray-800" />
              </button>
            </div>
            
            {/* Background Controls */}
            <div className="relative">
              <AnimatePresence>
                {isBackgroundMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute bottom-full mb-3 w-72 bg-white/80 backdrop-blur-lg rounded-xl p-2 border border-gray-200/80 shadow-lg"
                  >
                    <div className="grid grid-cols-2 gap-2 p-1">
                      {backgroundInstructions.map((bg) => (
                        <button
                          key={bg}
                          onClick={() => { onSelectBackground(bg); setIsBackgroundMenuOpen(false); }}
                          disabled={isLoading || bg === currentBackgroundInstruction}
                          className="w-full text-left text-sm font-medium text-gray-800 p-2 rounded-md hover:bg-gray-200/70 disabled:opacity-50 disabled:bg-gray-200/70 disabled:font-bold disabled:cursor-not-allowed"
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                     <form onSubmit={handleCustomBackgroundSubmit} className="p-2 border-t border-gray-200/80">
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Custom Background</label>
                        <input
                          type="text"
                          value={customBackground}
                          onChange={(e) => setCustomBackground(e.target.value)}
                          placeholder="e.g., Parisian cafe"
                          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-gray-800"
                        />
                      </form>
                      <div className="p-2 border-t border-gray-200/80">
                        <label
                          htmlFor="background-upload"
                          className={`flex items-center justify-center gap-2 w-full text-center text-sm font-medium text-gray-800 p-2 rounded-md transition-colors ${isLoading ? 'cursor-not-allowed text-gray-400' : 'hover:bg-gray-200/70 cursor-pointer'}`}
                        >
                          <UploadCloudIcon className="w-4 h-4" />
                          Upload Background
                        </label>
                        <input
                          id="background-upload"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleBackgroundFileChange}
                          disabled={isLoading}
                        />
                      </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                onClick={() => setIsBackgroundMenuOpen(!isBackgroundMenuOpen)}
                className="flex items-center justify-center bg-white/60 backdrop-blur-md rounded-full p-4 border border-gray-300/50" 
                title={`Change background: ${currentBackgroundInstruction}`}
                aria-label="Change background"
              >
                <ImageIcon className="w-5 h-5 text-gray-800" />
              </button>
            </div>

            {/* Color Controls */}
            {currentOutfitIndex > 0 && (
              <div className="relative">
                <AnimatePresence>
                  {isColorMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute bottom-full mb-3 w-72 bg-white/80 backdrop-blur-lg rounded-xl p-2 border border-gray-200/80 shadow-lg"
                    >
                      <div className="grid grid-cols-4 gap-2 p-1">
                        {colorInstructions.map((color) => (
                          <button
                            key={color}
                            onClick={() => { onSelectColor(color); setIsColorMenuOpen(false); }}
                            disabled={isLoading || color === currentColorInstruction}
                            className="w-full text-center text-sm font-medium text-gray-800 p-2 rounded-md hover:bg-gray-200/70 disabled:opacity-50 disabled:bg-gray-200/70 disabled:font-bold disabled:cursor-not-allowed"
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button 
                  onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
                  className="flex items-center justify-center bg-white/60 backdrop-blur-md rounded-full p-4 border border-gray-300/50" 
                  title={`Change color: ${currentColorInstruction}`}
                  aria-label="Change color"
                >
                  <PaletteIcon className="w-5 h-5 text-gray-800" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;