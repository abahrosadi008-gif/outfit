/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import { generateVirtualTryOnImage, generatePoseVariation, generateEmotionVariation, generateBackgroundVariation, generateColorVariation, generateUploadedBackgroundVariation } from './services/geminiService';
import { OutfitLayer, WardrobeItem } from './types';
import { ChevronDownIcon, ChevronUpIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import Footer from './components/Footer';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';

const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Jumping in the air, mid-action shot",
  "Walking towards camera",
  "Leaning against a wall",
];

const EMOTION_INSTRUCTIONS = ["Neutral", "Happy", "Sad", "Serious"];
const BACKGROUND_INSTRUCTIONS = ["Neutral studio backdrop", "City street at night", "Serene beach at sunset", "Lush green forest", "Modern art gallery"];
const COLOR_INSTRUCTIONS = ["Original", "Vibrant Red", "Deep Blue", "Forest Green", "Classic Black", "Pure White", "Sunny Yellow", "Hot Pink"];


const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQueryList.addEventListener('change', listener);
    
    if (mediaQueryList.matches !== matches) {
      setMatches(mediaQueryList.matches);
    }

    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query, matches]);

  return matches;
};


const App: React.FC = () => {
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseInstruction, setCurrentPoseInstruction] = useState<string>(POSE_INSTRUCTIONS[0]);
  const [currentEmotionInstruction, setCurrentEmotionInstruction] = useState<string>(EMOTION_INSTRUCTIONS[0]);
  const [currentBackgroundInstruction, setCurrentBackgroundInstruction] = useState<string>(BACKGROUND_INSTRUCTIONS[0]);
  const [currentColorInstruction, setCurrentColorInstruction] = useState<string>(COLOR_INSTRUCTIONS[0]);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const activeOutfitLayers = useMemo(() => 
    outfitHistory.slice(0, currentOutfitIndex + 1), 
    [outfitHistory, currentOutfitIndex]
  );
  
  const activeGarmentIds = useMemo(() => 
    activeOutfitLayers.map(layer => layer.garment?.id).filter(Boolean) as string[], 
    [activeOutfitLayers]
  );
  
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return modelImageUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return modelImageUrl;

    const primaryKey = `${currentPoseInstruction}_${currentEmotionInstruction}_${currentBackgroundInstruction}_${currentColorInstruction}`;
    if (currentLayer.generatedImages[primaryKey]) {
        return currentLayer.generatedImages[primaryKey];
    }
    
    // Fallback strategy to find the best available image
    const keys = Object.keys(currentLayer.generatedImages);
    
    // 1. Match pose, emotion, background - any color
    const poseEmotionBgFallback = keys.find(key => key.startsWith(`${currentPoseInstruction}_${currentEmotionInstruction}_${currentBackgroundInstruction}_`));
    if (poseEmotionBgFallback) return currentLayer.generatedImages[poseEmotionBgFallback];
    
    // 2. Match pose, emotion - any background, any color
    const poseEmotionFallback = keys.find(key => key.startsWith(`${currentPoseInstruction}_${currentEmotionInstruction}_`));
    if (poseEmotionFallback) return currentLayer.generatedImages[poseEmotionFallback];
    
    // 3. Match pose - any emotion, any background, any color
    const poseFallback = keys.find(key => key.startsWith(`${currentPoseInstruction}_`));
    if (poseFallback) return currentLayer.generatedImages[poseFallback];

    // 4. Last resort: return the first available image for the layer
    return Object.values(currentLayer.generatedImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseInstruction, currentEmotionInstruction, currentBackgroundInstruction, currentColorInstruction, modelImageUrl]);

  const availablePoseKeys = useMemo(() => {
    if (outfitHistory.length === 0) return [];
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return [];
    const generatedPoses = Object.keys(currentLayer.generatedImages).map(key => key.split('_')[0]);
    return [...new Set(generatedPoses)];
  }, [outfitHistory, currentOutfitIndex]);
  
  const resetStateForNewGarment = () => {
    setCurrentPoseInstruction(POSE_INSTRUCTIONS[0]);
    setCurrentEmotionInstruction(EMOTION_INSTRUCTIONS[0]);
    setCurrentBackgroundInstruction(BACKGROUND_INSTRUCTIONS[0]);
    setCurrentColorInstruction(COLOR_INSTRUCTIONS[0]);
  }

  const handleModelFinalized = (url: string) => {
    setModelImageUrl(url);
    const initialKey = `${POSE_INSTRUCTIONS[0]}_${EMOTION_INSTRUCTIONS[0]}_${BACKGROUND_INSTRUCTIONS[0]}_${COLOR_INSTRUCTIONS[0]}`;
    setOutfitHistory([{
      garment: null,
      generatedImages: { [initialKey]: url }
    }]);
    setCurrentOutfitIndex(0);
    resetStateForNewGarment();
  };

  const handleStartOver = () => {
    setModelImageUrl(null);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    resetStateForNewGarment();
    setIsSheetCollapsed(false);
    setWardrobe(defaultWardrobe);
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;

    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id) {
        setCurrentOutfitIndex(prev => prev + 1);
        resetStateForNewGarment();
        return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Adding ${garmentInfo.name}...`);
    
    resetStateForNewGarment();

    try {
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl, garmentFile);
      const imageKey = `${POSE_INSTRUCTIONS[0]}_${EMOTION_INSTRUCTIONS[0]}_${BACKGROUND_INSTRUCTIONS[0]}_${COLOR_INSTRUCTIONS[0]}`;
      
      const newLayer: OutfitLayer = { 
        garment: garmentInfo, 
        generatedImages: { [imageKey]: newImageUrl } 
      };

      setOutfitHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, currentOutfitIndex + 1);
        return [...newHistory, newLayer];
      });
      setCurrentOutfitIndex(prev => prev + 1);
      
      setWardrobe(prev => {
        if (prev.find(item => item.id === garmentInfo.id)) {
            return prev;
        }
        return [...prev, garmentInfo];
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, outfitHistory, currentOutfitIndex]);

  const handleRemoveLastGarment = () => {
    if (currentOutfitIndex > 0) {
      setCurrentOutfitIndex(prevIndex => prevIndex - 1);
      resetStateForNewGarment();
    }
  };
  
  const handlePoseSelect = useCallback(async (newInstruction: string) => {
    if (isLoading || outfitHistory.length === 0 || newInstruction === currentPoseInstruction) return;
    
    const imageKey = `${newInstruction}_${currentEmotionInstruction}_${currentBackgroundInstruction}_${currentColorInstruction}`;
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.generatedImages[imageKey]) {
      setCurrentPoseInstruction(newInstruction);
      return;
    }

    const baseImageForPoseChange = displayImageUrl;
    if (!baseImageForPoseChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);
    
    const prevPoseInstruction = currentPoseInstruction;
    setCurrentPoseInstruction(newInstruction);

    try {
      const newImageUrl = await generatePoseVariation(baseImageForPoseChange, newInstruction);
      setOutfitHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const updatedLayer = newHistory[currentOutfitIndex];
        updatedLayer.generatedImages[imageKey] = newImageUrl;
        return newHistory;
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
      setCurrentPoseInstruction(prevPoseInstruction);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseInstruction, currentEmotionInstruction, currentBackgroundInstruction, currentColorInstruction, outfitHistory, isLoading, currentOutfitIndex, displayImageUrl]);

  const handleEmotionSelect = useCallback(async (newInstruction: string) => {
    if (isLoading || outfitHistory.length === 0 || newInstruction === currentEmotionInstruction) return;

    const imageKey = `${currentPoseInstruction}_${newInstruction}_${currentBackgroundInstruction}_${currentColorInstruction}`;
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.generatedImages[imageKey]) {
        setCurrentEmotionInstruction(newInstruction);
        return;
    }

    const baseImageForEmotionChange = displayImageUrl;
    if (!baseImageForEmotionChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing emotion to ${newInstruction}...`);
    
    const prevEmotionInstruction = currentEmotionInstruction;
    setCurrentEmotionInstruction(newInstruction);

    try {
        const newImageUrl = await generateEmotionVariation(baseImageForEmotionChange, newInstruction);
        setOutfitHistory(prevHistory => {
            const newHistory = [...prevHistory];
            const updatedLayer = newHistory[currentOutfitIndex];
            updatedLayer.generatedImages[imageKey] = newImageUrl;
            return newHistory;
        });
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Failed to change emotion'));
        setCurrentEmotionInstruction(prevEmotionInstruction);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [currentPoseInstruction, currentEmotionInstruction, currentBackgroundInstruction, currentColorInstruction, outfitHistory, isLoading, currentOutfitIndex, displayImageUrl]);

  const handleBackgroundChange = useCallback(async (newInstruction: string) => {
    if (isLoading || outfitHistory.length === 0 || newInstruction === currentBackgroundInstruction) return;

    const imageKey = `${currentPoseInstruction}_${currentEmotionInstruction}_${newInstruction}_${currentColorInstruction}`;
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.generatedImages[imageKey]) {
        setCurrentBackgroundInstruction(newInstruction);
        return;
    }

    const baseImageForBackgroundChange = displayImageUrl;
    if (!baseImageForBackgroundChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing background...`);
    
    const prevBackgroundInstruction = currentBackgroundInstruction;
    setCurrentBackgroundInstruction(newInstruction);

    try {
        const newImageUrl = await generateBackgroundVariation(baseImageForBackgroundChange, newInstruction);
        setOutfitHistory(prevHistory => {
            const newHistory = [...prevHistory];
            const updatedLayer = newHistory[currentOutfitIndex];
            updatedLayer.generatedImages[imageKey] = newImageUrl;
            return newHistory;
        });
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Failed to change background'));
        setCurrentBackgroundInstruction(prevBackgroundInstruction);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [currentPoseInstruction, currentEmotionInstruction, currentBackgroundInstruction, currentColorInstruction, outfitHistory, isLoading, currentOutfitIndex, displayImageUrl]);

  const handleBackgroundUpload = useCallback(async (file: File) => {
    if (isLoading || outfitHistory.length === 0) return;

    const newInstruction = `Uploaded: ${file.name}`;
    const imageKey = `${currentPoseInstruction}_${currentEmotionInstruction}_${newInstruction}_${currentColorInstruction}`;
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.generatedImages[imageKey]) {
        setCurrentBackgroundInstruction(newInstruction);
        return;
    }

    const baseImageForBackgroundChange = displayImageUrl;
    if (!baseImageForBackgroundChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage('Applying custom background...');
    
    const prevBackgroundInstruction = currentBackgroundInstruction;
    setCurrentBackgroundInstruction(newInstruction);

    try {
        const newImageUrl = await generateUploadedBackgroundVariation(baseImageForBackgroundChange, file);
        setOutfitHistory(prevHistory => {
            const newHistory = [...prevHistory];
            const updatedLayer = newHistory[currentOutfitIndex];
            updatedLayer.generatedImages[imageKey] = newImageUrl;
            return newHistory;
        });
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Failed to apply custom background'));
        setCurrentBackgroundInstruction(prevBackgroundInstruction);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [currentPoseInstruction, currentEmotionInstruction, currentBackgroundInstruction, currentColorInstruction, outfitHistory, isLoading, currentOutfitIndex, displayImageUrl]);


  const handleColorChange = useCallback(async (newInstruction: string) => {
    if (isLoading || outfitHistory.length === 0 || newInstruction === currentColorInstruction || currentOutfitIndex === 0) return;

    const imageKey = `${currentPoseInstruction}_${currentEmotionInstruction}_${currentBackgroundInstruction}_${newInstruction}`;
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.generatedImages[imageKey]) {
        setCurrentColorInstruction(newInstruction);
        return;
    }
    
    // Use the "Original" color version of the current pose/emotion/bg as the base for generating a new color
    const originalColorKey = `${currentPoseInstruction}_${currentEmotionInstruction}_${currentBackgroundInstruction}_${COLOR_INSTRUCTIONS[0]}`;
    const baseImageForColorChange = currentLayer.generatedImages[originalColorKey];
    if (!baseImageForColorChange) {
        setError("The original image for this outfit is missing. Cannot change color.");
        return;
    };

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing color to ${newInstruction}...`);
    
    const prevColorInstruction = currentColorInstruction;
    setCurrentColorInstruction(newInstruction);

    try {
        const newImageUrl = await generateColorVariation(baseImageForColorChange, newInstruction);
        setOutfitHistory(prevHistory => {
            const newHistory = [...prevHistory];
            const updatedLayer = newHistory[currentOutfitIndex];
            updatedLayer.generatedImages[imageKey] = newImageUrl;
            return newHistory;
        });
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Failed to change color'));
        setCurrentColorInstruction(prevColorInstruction);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [currentPoseInstruction, currentEmotionInstruction, currentBackgroundInstruction, currentColorInstruction, outfitHistory, isLoading, currentOutfitIndex, displayImageUrl]);


  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };

  return (
    <div className="font-sans">
      <AnimatePresence mode="wait">
        {!modelImageUrl ? (
          <motion.div
            key="start-screen"
            className="w-screen min-h-screen flex items-start sm:items-center justify-center bg-gray-50 p-4 pb-20"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <StartScreen onModelFinalized={handleModelFinalized} />
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            className="relative flex flex-col h-screen bg-white overflow-hidden"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <main className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
              <div className="w-full h-full flex-grow flex items-center justify-center bg-white pb-16 relative">
                <Canvas 
                  displayImageUrl={displayImageUrl}
                  onStartOver={handleStartOver}
                  isLoading={isLoading}
                  loadingMessage={loadingMessage}
                  onSelectPose={handlePoseSelect}
                  poseInstructions={POSE_INSTRUCTIONS}
                  currentPoseInstruction={currentPoseInstruction}
                  availablePoseKeys={availablePoseKeys}
                  onSelectEmotion={handleEmotionSelect}
                  emotionInstructions={EMOTION_INSTRUCTIONS}
                  currentEmotionInstruction={currentEmotionInstruction}
                  onSelectBackground={handleBackgroundChange}
                  onUploadBackground={handleBackgroundUpload}
                  backgroundInstructions={BACKGROUND_INSTRUCTIONS}
                  currentBackgroundInstruction={currentBackgroundInstruction}
                  onSelectColor={handleColorChange}
                  colorInstructions={COLOR_INSTRUCTIONS}
                  currentColorInstruction={currentColorInstruction}
                  activeOutfitLayer={outfitHistory[currentOutfitIndex]}
                  currentOutfitIndex={currentOutfitIndex}
                />
              </div>

              <aside 
                className={`absolute md:relative md:flex-shrink-0 bottom-0 right-0 h-auto md:h-full w-full md:w-1/3 md:max-w-sm bg-white/80 backdrop-blur-md flex flex-col border-t md:border-t-0 md:border-l border-gray-200/60 transition-transform duration-500 ease-in-out ${isSheetCollapsed ? 'translate-y-[calc(100%-4.5rem)]' : 'translate-y-0'} md:translate-y-0`}
                style={{ transitionProperty: 'transform' }}
              >
                  <button 
                    onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} 
                    className="md:hidden w-full h-8 flex items-center justify-center bg-gray-100/50"
                    aria-label={isSheetCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    {isSheetCollapsed ? <ChevronUpIcon className="w-6 h-6 text-gray-500" /> : <ChevronDownIcon className="w-6 h-6 text-gray-500" />}
                  </button>
                  <div className="p-4 md:p-6 pb-20 overflow-y-auto flex-grow flex flex-col gap-8">
                    {error && (
                      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                      </div>
                    )}
                    <OutfitStack 
                      outfitHistory={activeOutfitLayers}
                      onRemoveLastGarment={handleRemoveLastGarment}
                    />
                    <WardrobePanel
                      onGarmentSelect={handleGarmentSelect}
                      activeGarmentIds={activeGarmentIds}
                      isLoading={isLoading}
                      wardrobe={wardrobe}
                    />
                  </div>
              </aside>
            </main>
            <AnimatePresence>
              {isLoading && isMobile && (
                <motion.div
                  className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-50"
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
          </motion.div>
        )}
      </AnimatePresence>
      <Footer isOnDressingScreen={!!modelImageUrl} />
    </div>
  );
};

export default App;