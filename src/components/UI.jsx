import React, { useState, useEffect } from 'react';
import { unlockAudio } from '../utils/tts';

const freeReadingContents = [
  'Triển Lãm 3D',
  'TRANG 1 — NGUỒN GỐC CỦA NGUYÊN LÝ VỀ SỰ PHÁT TRIỂN',
  'TRANG 2 — BIỂU HIỆN VÀ NGUỒN GỐC NỘI TẠI CỦA SỰ PHÁT TRIỂN',
  'TRANG 3 — KHÁI NIỆM VÀ SỰ KHÁC BIỆT GIỮA VẬN ĐỘNG VỚI PHÁT TRIỂN',
  'TRANG 4 — NỘI DUNG CƠ BẢN CỦA NGUYÊN LÝ VỀ SỰ PHÁT TRIỂN',
  'TRANG 5 — CÁC TÍNH CHẤT CỦA SỰ PHÁT TRIỂN',
  'TRANG 6 — Ý NGHĨA PHƯƠNG PHÁP LUẬN',
  'TRANG 7 — BÀI HỌC THỰC TIỄN VÀ KẾT LUẬN',
  'Bìa Sau'
];

export default function UI({ 
  currentPage, 
  setCurrentPage, 
  maxPages = 8, 
  freeReading, 
  setFreeReading, 
  setStarted,
  audioBookActive,
  setAudioBookActive,
  isMuted,
  setIsMuted,
  handleReadPageManual,
  manualSpeakingPage
}) {
  const bottomBarItems = [
    { label: 'BÌA', page: 0 },
    { label: 'TRANG 1', page: 1 },
    { label: 'TRANG 2', page: 2 },
    { label: 'TRANG 3', page: 3 },
    { label: 'TRANG 4', page: 4 },
    { label: 'TRANG 5', page: 5 },
    { label: 'TRANG 6', page: 6 },
    { label: 'TRANG 7', page: 7 },
    { label: 'BÌA SAU', page: 8 }
  ];

  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const bottomClass = 'bottom-[calc(1rem+env(safe-area-inset-bottom))]';

  // Sync bottom bar highlight with book clicking page changes
  useEffect(() => {
    if (freeReading) {
      const currentMappedPage = bottomBarItems[selectedItemIdx]?.page;
      if (currentMappedPage !== currentPage) {
        const firstMatchIdx = bottomBarItems.findIndex(item => item.page === currentPage);
        if (firstMatchIdx !== -1) {
          setSelectedItemIdx(firstMatchIdx);
        }
      }
    }
  }, [currentPage, freeReading]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 font-sans">
      <style>{`
        @keyframes bounce-wave {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
      `}</style>

      {/* Floating Guided Tour Audiobook Controls (Shown when experience started, only in guided tour mode) */}
      {!freeReading && (
        <div className="absolute left-4 top-4 right-4 md:left-10 md:top-10 md:right-auto flex flex-col gap-2 pointer-events-auto select-none z-20">
          <div className="bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-xl px-4 py-2.5 md:px-5 md:py-3 rounded-full flex items-center justify-between md:justify-start gap-3 md:gap-4 text-gray-800 transition-all duration-300">
            {/* Sounds Wave animation */}
            <div className="flex items-end gap-[3px] h-3.5 w-6 pb-[2px]">
              {[1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className="w-[3px] bg-[#b22222] rounded-full transition-all duration-300 origin-bottom"
                  style={{
                    animationName: (audioBookActive || manualSpeakingPage === currentPage) && !isMuted ? 'bounce-wave' : 'none',
                    animationDuration: '0.8s',
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${bar * 0.15}s`,
                    height: (audioBookActive || manualSpeakingPage === currentPage) && !isMuted ? '12px' : '4px',
                    transform: (audioBookActive || manualSpeakingPage === currentPage) && !isMuted ? undefined : 'scaleY(1)'
                  }}
                />
              ))}
            </div>

            <div 
              onClick={() => handleReadPageManual(currentPage)}
              className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity select-none group/read"
              title="Bấm để đọc trang này bằng tiếng Việt"
            >
              <span className="text-[8px] md:text-[9px] font-extrabold text-[#b22222] uppercase tracking-widest leading-none flex items-center gap-0.5 md:gap-1">
                TỰ ĐỘNG ĐỌC SÁCH
                <svg className={`w-2 h-2 md:w-2.5 md:h-2.5 ${manualSpeakingPage === currentPage ? 'text-yellow-600 fill-current' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
                </svg>
              </span>
              <span className="text-[10px] md:text-[11px] font-bold text-gray-600 leading-none mt-1 group-hover/read:text-[#b22222] transition-colors">
                Trang {currentPage}/8 {manualSpeakingPage === currentPage && " (Đang đọc)"}
              </span>
            </div>

            {/* Vertical divider line */}
            <div className="w-[1px] h-6 bg-gray-200" />

            {/* Buttons controls */}
            <div className="flex items-center gap-1.5">
              {/* Prev Page */}
              <button
                onClick={() => {
                  unlockAudio();
                  setCurrentPage(prev => Math.max(0, prev - 1));
                }}
                disabled={currentPage === 0}
                className="p-1 rounded-full hover:bg-black/5 text-gray-600 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                title="Trang trước"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Play / Pause Toggle */}
              <button
                onClick={() => {
                  unlockAudio();
                  setAudioBookActive(!audioBookActive);
                }}
                className="w-7 h-7 rounded-full bg-[#b22222] hover:bg-[#8b0000] text-white flex items-center justify-center shadow-md transition-all duration-300 active:scale-95 cursor-pointer"
                title={audioBookActive ? "Tạm dừng tự động đọc" : "Bắt đầu tự động đọc"}
              >
                {audioBookActive ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Next Page */}
              <button
                onClick={() => {
                  unlockAudio();
                  setCurrentPage(prev => Math.min(8, prev + 1));
                }}
                disabled={currentPage === 8}
                className="p-1 rounded-full hover:bg-black/5 text-gray-600 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                title="Trang tiếp theo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Mute toggle */}
              <button
                onClick={() => {
                  unlockAudio();
                  setIsMuted(!isMuted);
                }}
                className="p-1 rounded-full hover:bg-black/5 text-gray-600 transition-colors cursor-pointer"
                title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted ? (
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top right pills during active experience */}
      {freeReading ? (
        <div className="absolute right-4 top-4 md:right-10 md:top-10 pointer-events-auto select-none z-10">
          <button
            onClick={() => {
              setStarted(false);
              setFreeReading(false);
              setCurrentPage(0);
              setAudioBookActive(false);
            }}
            className="bg-white/95 hover:bg-[#b22222] hover:text-white text-gray-800 px-4 py-2 rounded-full border border-gray-200 shadow-lg backdrop-blur-md transition-all duration-300 font-bold text-[10px] tracking-wider uppercase cursor-pointer"
          >
            Thoát
          </button>
        </div>
      ) : (
        <div className="hidden md:flex absolute right-10 top-10 pointer-events-auto select-none z-10">
          <button
            onClick={() => {
              setFreeReading(true);
              setAudioBookActive(false);
              setCurrentPage(0);
            }}
            className="bg-white/95 hover:bg-[#b22222] hover:text-white text-gray-800 px-4 py-2 rounded-full border border-gray-200 shadow-lg backdrop-blur-md transition-all duration-300 font-bold text-[10px] tracking-wider uppercase cursor-pointer"
          >
            Đọc tự do
          </button>
        </div>
      )}

      {/* Bottom-left information card (only shown in normal mode on desktop) */}
      {!freeReading && (
        <div className="hidden md:flex absolute left-10 bottom-12 max-w-sm pointer-events-auto flex-col items-start select-none">
          <h2 
            className="text-[#1a1a1a] text-2xl md:text-3xl font-bold tracking-tight"
            style={{ fontFamily: '"Georgia", serif' }}
          >
            Triển Lãm 3D
          </h2>
        </div>
      )}

      {/* Mobile Bottom Unified Control Card (only shown in normal mode on mobile) */}
      {!freeReading && (
        <div className={`absolute ${bottomClass} left-4 right-4 md:bottom-4 md:hidden pointer-events-auto flex flex-col items-center bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-2xl rounded-3xl px-5 py-3 select-none text-center`}>
          <span className="text-[9px] font-extrabold text-[#a62c2c] uppercase tracking-widest mb-2.5">
            TRIỂN LÃM 3D
          </span>
          <button
            onClick={() => {
              setFreeReading(true);
              setAudioBookActive(false);
              setCurrentPage(0);
            }}
            className="w-full bg-[#b22222] hover:bg-[#8b0000] text-white py-2.5 rounded-full shadow-md transition-all duration-300 font-bold text-[10px] tracking-wider uppercase cursor-pointer"
          >
            Đọc tự do
          </button>
        </div>
      )}

      {/* Free reading mode bottom page selector */}
      {freeReading && (
        <div className={`absolute ${bottomClass} left-1/2 -translate-x-1/2 md:bottom-6 bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-xl px-6 py-2.5 rounded-full flex items-center gap-4 pointer-events-auto select-none max-w-[90vw] overflow-x-auto scrollbar-none`}>
          {bottomBarItems.map((item, idx) => {
            const isSelected = selectedItemIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedItemIdx(idx);
                  setCurrentPage(item.page);
                }}
                className={`text-[10px] md:text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer py-1.5 ${
                  isSelected
                    ? 'bg-[#1a1a1a] text-white px-4 rounded-full shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 px-2'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
