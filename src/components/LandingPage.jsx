import React, { useState, useEffect } from 'react';

export default function LandingPage({ onStart, progress = 0, is3DLoading = true }) {
  const [isFading, setIsFading] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  const handleStart = () => {
    onStart();
    setIsFading(true);
    setTimeout(() => {
      setShouldRender(false);
    }, 800);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col justify-between items-center px-6 py-6 md:py-12 bg-[#eae6df] transition-opacity duration-700 ease-out select-none ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      style={{ fontFamily: '"Georgia", serif' }}
    >
      {/* Top spacing / invisible anchor */}
      <div></div>

      {/* Main Content Card */}
      <div className="flex flex-col items-center text-center max-w-2xl px-4 -translate-y-4 md:-translate-y-8">
        {/* Module Subtitle */}
        <span className="text-[#a62c2c] text-xs md:text-sm font-semibold tracking-widest uppercase mb-4 md:mb-6 font-sans animate__animated animate__fadeInDown" style={{ animationDuration: '0.8s' }}>
          HỌC PHẦN: TRIẾT HỌC MÁC - LÊNIN
        </span>

        {/* Main Serif Header */}
        <h1 className="text-[#1a1a1a] text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-4 md:mb-8 animate__animated animate__fadeInUp" style={{ animationDuration: '1s', animationDelay: '0.2s' }}>
          Thế Giới Không<br />
          <span className="italic font-normal font-serif">Ngừng Tiến Lên?</span>
        </h1>

        {/* Small separator line */}
        <div className="w-16 h-[2px] bg-[#a62c2c]/30 mb-4 md:mb-8 animate__animated animate__fadeIn" style={{ animationDuration: '1s', animationDelay: '0.5s' }}></div>

        {/* Description Text */}
        <p className="text-[#555555] text-sm md:text-lg leading-relaxed font-sans font-medium max-w-xl animate__animated animate__fadeInUp" style={{ animationDuration: '1s', animationDelay: '0.7s' }}>
          Khám phá góc nhìn triết học về Nguyên lý về sự phát triển: Đây chỉ là một dòng chảy ngẫu nhiên, vô định hay là quy luật khách quan tất yếu tách rời ý muốn con người?
        </p>

        {/* Explicit Spacer */}
        <div className="h-[4vh] md:h-[8vh] min-h-[24px]"></div>

        {/* Explore Button or Loader */}
        {is3DLoading ? (
          <div className="flex flex-col items-center gap-3.5 w-64 md:w-80 animate__animated animate__fadeIn select-none">
            <div className="w-full h-2 bg-[#a62c2c]/10 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-[#b22222] to-[#ff4500] rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs md:text-sm font-sans font-bold text-[#b22222] tracking-wider animate-pulse">
              ĐANG TẢI MÔ HÌNH 3D... {Math.round(progress)}%
            </span>
          </div>
        ) : (
          <button
            onClick={handleStart}
            className="group relative flex items-center gap-3 bg-[#b22222] hover:bg-[#8b0000] text-white font-sans text-xs md:text-sm font-bold tracking-wider uppercase px-6 py-3.5 md:px-8 md:py-4 rounded-full shadow-xl shadow-red-900/25 hover:shadow-red-900/40 transition-all duration-300 active:scale-95 cursor-pointer animate__animated animate__zoomIn"
            style={{ animationDuration: '0.8s', animationDelay: '0.2s' }}
          >
            <span>Bắt đầu khám phá</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
        )}
      </div>

      {/* Bottom spacer to preserve justify-between flexbox balance */}
      <div></div>
    </div>
  );
}
