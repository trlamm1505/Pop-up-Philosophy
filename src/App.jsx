import React, { useState, useEffect } from 'react';
import BookScene from './components/BookScene';
import UI from './components/UI';
import LandingPage from './components/LandingPage';
import AIAssistant from './components/AIAssistant';
import { bookContent } from './data/bookContent';
import { playVietnameseSpeech, cancelTTS, prefetchBookAudio, unlockAudio } from './utils/tts';
import { useProgress } from '@react-three/drei';
import 'animate.css';

export default function App() {
  const { progress } = useProgress();
  const [isBookReady, setIsBookReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [freeReading, setFreeReading] = useState(false);
  const [audioBookActive, setAudioBookActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [manualSpeakingPage, setManualSpeakingPage] = useState(null);

  const is3DLoading = !isBookReady;

  // Prefetch audio assets on startup so pages read instantly on click
  useEffect(() => {
    prefetchBookAudio();
  }, []);

  // Cancel manual reading voice when turning the page
  useEffect(() => {
    setManualSpeakingPage(null);
  }, [currentPage]);

  const handleStartExperience = () => {
    unlockAudio(); // Unlock all browser audio engines synchronously on click
    setStarted(true);
    setCurrentPage(0);
    setFreeReading(false);
    setAudioBookActive(true);
    setIsMuted(false);
    setManualSpeakingPage(null);
  };

  const handleReadPageManual = (pageIndex) => {
    unlockAudio();
    if (manualSpeakingPage === pageIndex) {
      cancelTTS();
      setManualSpeakingPage(null);
      return;
    }

    setManualSpeakingPage(pageIndex);
    const rawText = bookContent(pageIndex);
    if (!rawText) return;

    // Turn off automatic guided tour audiobook active mode to prevent overlapping logic
    setAudioBookActive(false);

    playVietnameseSpeech(
      rawText,
      () => {
        setManualSpeakingPage(null);
        if (pageIndex === 8) {
          setTimeout(() => {
            setFreeReading(true);
            setCurrentPage(0);
          }, 800);
        }
      },
      isMuted,
      pageIndex
    );
  };

  // Guided Tour Speech Player
  const speakPage = (pageIndex) => {
    const rawText = bookContent(pageIndex);
    if (!rawText) return;

    playVietnameseSpeech(
      rawText,
      () => {
        // On end of chunk reading: if autoplay is active, flip to next page
        if (pageIndex < 8) {
          setTimeout(() => {
            setCurrentPage((prev) => {
              if (prev === pageIndex) {
                return prev + 1;
              }
              return prev;
            });
          }, 800); // 800ms natural pause before starting the flip
        } else {
          setTimeout(() => {
            setFreeReading(true);
            setAudioBookActive(false);
            setCurrentPage(0);
          }, 800);
        }
      },
      isMuted,
      pageIndex
    );
  };

  // Control autoplay speech based on active page and mute states
  useEffect(() => {
    if (started && audioBookActive && !freeReading) {
      // Start fetching immediately to overlap API request with page-turn animation
      const timer = setTimeout(() => {
        speakPage(currentPage);
      }, 50);

      return () => {
        clearTimeout(timer);
        cancelTTS();
      };
    } else {
      cancelTTS();
    }
  }, [currentPage, audioBookActive, started, isMuted, freeReading]);

  // Keyboard navigation listener in Free Reading mode
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!started || !freeReading) return;

      if (event.key === 'ArrowRight') {
        setCurrentPage((prev) => Math.min(prev + 1, 8));
      } else if (event.key === 'ArrowLeft') {
        setCurrentPage((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [started, freeReading]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#eae6df]">
      {/* 3D WebGL Canvas Scene */}
      <div className={`absolute inset-0 w-full h-full ${started ? 'animate__animated animate__zoomInRight' : ''}`} style={started ? { animationDuration: '1.2s' } : {}}>
        <BookScene
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          started={started}
          freeReading={freeReading}
          setFreeReading={setFreeReading}
          onReady={() => setIsBookReady(true)}
        />
      </div>

      {/* 2D User Interface Overlay (only rendered once the experience starts) */}
      {started && (
        <>
          <UI
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            maxPages={8}
            freeReading={freeReading}
            setFreeReading={setFreeReading}
            setStarted={setStarted}
            audioBookActive={audioBookActive}
            setAudioBookActive={setAudioBookActive}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            handleReadPageManual={handleReadPageManual}
            manualSpeakingPage={manualSpeakingPage}
          />
          <AIAssistant
            currentPage={currentPage}
            started={started}
            freeReading={freeReading}
          />
        </>
      )}

      {/* Landing / Intro Page Overlay */}
      {!started && <LandingPage onStart={handleStartExperience} progress={progress} is3DLoading={is3DLoading} />}
    </div>
  );
}
