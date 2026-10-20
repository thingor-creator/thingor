import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp, useModalBack } from '../context/AppContext';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Images,
  RotateCcw,
} from 'lucide-react';

export const ImageViewerModal: React.FC = () => {
  const { imageViewerData, closeImageViewer, language } = useApp();
  const isHu = language === 'hu';

  const isOpen = imageViewerData !== null && imageViewerData.photos.length > 0;
  useModalBack(isOpen, closeImageViewer, 'image-viewer-modal');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Interaction refs
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);
  const lastTapRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync index with imageViewerData
  useEffect(() => {
    if (imageViewerData) {
      setCurrentIndex(imageViewerData.activeIndex || 0);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [imageViewerData]);

  // Reset transform when changing photo
  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  const handleNext = useCallback(() => {
    if (!imageViewerData || imageViewerData.photos.length <= 1) return;
    resetTransform();
    setCurrentIndex(prev => (prev + 1) % imageViewerData.photos.length);
  }, [imageViewerData, resetTransform]);

  const handlePrev = useCallback(() => {
    if (!imageViewerData || imageViewerData.photos.length <= 1) return;
    resetTransform();
    setCurrentIndex(prev => (prev - 1 + imageViewerData.photos.length) % imageViewerData.photos.length);
  }, [imageViewerData, resetTransform]);

  // Zoom helpers
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(6, Number((prev + 0.4).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(0.6, Number((prev - 0.4).toFixed(2)));
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const toggleZoomFit = useCallback(() => {
    if (scale !== 1 || position.x !== 0 || position.y !== 0) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale, position]);

  const rotateClockwise = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeImageViewer();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      } else if (e.key === '0') {
        resetTransform();
      } else if (e.key.toLowerCase() === 'r') {
        rotateClockwise();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeImageViewer, handleNext, handlePrev, zoomIn, zoomOut, resetTransform, rotateClockwise]);

  // Desktop Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = e.deltaY < 0 ? 0.25 : -0.25;
    setScale(prev => {
      const next = Math.min(6, Math.max(0.6, Number((prev + zoomFactor).toFixed(2))));
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Mouse Drag (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mobile Touch Gestures (Pinch to Zoom, Pan, Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch to zoom initiated
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();

      // Double tap detector
      if (now - lastTapRef.current < 300) {
        toggleZoomFit();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      // Pinching
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      const newScale = Math.min(6, Math.max(0.6, Number((initialScaleRef.current * ratio).toFixed(2))));
      setScale(newScale);
    } else if (e.touches.length === 1 && scale > 1 && isDragging) {
      // Panning while zoomed
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);

      // Snap back if scaled below 1
      if (scale < 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }

      // If at 1x, check for horizontal swipe to change photo
      if (scale === 1 && touchStartPosRef.current && e.changedTouches.length > 0) {
        const deltaX = e.changedTouches[0].clientX - touchStartPosRef.current.x;
        const deltaY = e.changedTouches[0].clientY - touchStartPosRef.current.y;
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          if (deltaX < 0) {
            handleNext();
          } else {
            handlePrev();
          }
        }
      }
      touchStartPosRef.current = null;
    }
  };

  if (!isOpen || !imageViewerData) return null;

  const currentPhoto = imageViewerData.photos[currentIndex] || imageViewerData.photos[0];
  const totalPhotos = imageViewerData.photos.length;

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black/95 backdrop-blur-xl animate-fadeIn select-none overflow-hidden"
      onClick={closeImageViewer}
      style={{ touchAction: 'none' }}
    >
      {/* Ambient background blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <img
          src={currentPhoto}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover blur-3xl scale-125 transition-all duration-500"
        />
      </div>

      {/* Top Header Bar */}
      <div
        className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-black/50 backdrop-blur-md shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="p-2 rounded-xl bg-white/10 text-white shrink-0">
            <Images className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
              {imageViewerData.title || (isHu ? 'Képnézegető' : 'Image Viewer')}
            </h3>
            {imageViewerData.subtitle && (
              <p className="text-xs text-white/60 truncate max-w-xs sm:max-w-md">
                {imageViewerData.subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {totalPhotos > 1 && (
            <div className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-white text-xs font-semibold tracking-wide">
              {currentIndex + 1} / {totalPhotos}
            </div>
          )}

          {/* Open full resolution original */}
          <a
            href={currentPhoto}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            title={isHu ? 'Megnyitás eredeti méretben' : 'Open original image'}
          >
            <ExternalLink className="h-5 w-5" />
          </a>

          {/* Close button */}
          <button
            type="button"
            onClick={closeImageViewer}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            title={isHu ? 'Bezárás (ESC)' : 'Close (ESC)'}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center p-2 sm:p-6 overflow-hidden cursor-default"
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={toggleZoomFit}
        style={{
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        {/* Previous Button (Desktop & Tablet) */}
        {totalPhotos > 1 && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handlePrev();
            }}
            className="hidden sm:flex absolute left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur border border-white/15 transition-all hover:scale-105 shadow-2xl items-center justify-center"
            title={isHu ? 'Előző kép (Bal nyíl)' : 'Previous photo (Left arrow)'}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Current Scaled / Panned / Rotated Image */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          <img
            key={`${currentPhoto}-${currentIndex}`}
            src={currentPhoto}
            alt={imageViewerData.title || ''}
            draggable={false}
            className="max-w-[94vw] max-h-[70vh] sm:max-h-[75vh] object-contain rounded-xl shadow-2xl select-none pointer-events-none"
          />
        </div>

        {/* Next Button (Desktop & Tablet) */}
        {totalPhotos > 1 && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handleNext();
            }}
            className="hidden sm:flex absolute right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur border border-white/15 transition-all hover:scale-105 shadow-2xl items-center justify-center"
            title={isHu ? 'Következő kép (Jobb nyíl)' : 'Next photo (Right arrow)'}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Floating Zoom & Controls Toolbar */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/20 shadow-2xl text-white"
          onClick={e => e.stopPropagation()}
        >
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= 0.6}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95 text-white"
            title={isHu ? 'Kicsinyítés (-)' : 'Zoom Out (-)'}
          >
            <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Current Zoom Level Percentage Badge (Click to reset) */}
          <button
            type="button"
            onClick={resetTransform}
            className="px-2.5 py-1 rounded-xl hover:bg-white/15 font-mono font-bold text-xs sm:text-sm text-emerald-400 min-w-[54px] sm:min-w-[62px] text-center transition-all"
            title={isHu ? 'Alaphelyzet / 100%' : 'Reset to 100%'}
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= 6}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95 text-white"
            title={isHu ? 'Nagyítás (+)' : 'Zoom In (+)'}
          >
            <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <div className="w-[1px] h-5 bg-white/20 mx-0.5 sm:mx-1" />

          {/* Toggle 1:1 or Fit */}
          <button
            type="button"
            onClick={toggleZoomFit}
            className={`p-2 sm:p-2.5 rounded-xl transition-all active:scale-95 ${
              scale !== 1 ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/15 text-white'
            }`}
            title={scale !== 1 ? (isHu ? 'Visszaállítás' : 'Reset') : (isHu ? '2.5x Nagyítás' : '2.5x Zoom')}
          >
            <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Rotate 90° */}
          <button
            type="button"
            onClick={rotateClockwise}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-white/15 transition-all active:scale-95 text-white"
            title={isHu ? 'Elforgatás 90°-kal' : 'Rotate 90°'}
          >
            <RotateCw className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Mobile Previous / Next Quick Buttons */}
          {totalPhotos > 1 && (
            <>
              <div className="w-[1px] h-5 bg-white/20 mx-0.5 sm:mx-1 sm:hidden" />
              <button
                type="button"
                onClick={handlePrev}
                className="sm:hidden p-2 rounded-xl hover:bg-white/15 transition-all text-white"
                title={isHu ? 'Előző' : 'Prev'}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="sm:hidden p-2 rounded-xl hover:bg-white/15 transition-all text-white"
                title={isHu ? 'Következő' : 'Next'}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bottom Thumbnail Strip (if multiple photos exist) */}
      {totalPhotos > 1 && (
        <div
          className="px-4 sm:px-6 py-2.5 border-t border-white/10 bg-black/60 backdrop-blur-md shrink-0 z-30 flex items-center justify-center gap-2 overflow-x-auto"
          onClick={e => e.stopPropagation()}
        >
          {imageViewerData.photos.map((photo, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                resetTransform();
                setCurrentIndex(idx);
              }}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                idx === currentIndex
                  ? 'border-emerald-400 scale-105 shadow-lg shadow-emerald-500/20'
                  : 'border-white/20 opacity-50 hover:opacity-90'
              }`}
            >
              <img
                src={photo}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
