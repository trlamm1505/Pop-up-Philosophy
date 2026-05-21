import React, { useState, useEffect, useRef } from 'react';
import { bookContent } from '../data/bookContent';
import { playVietnameseSpeech, cancelTTS, unlockAudio } from '../utils/tts';
import { fallbackData } from '../data/fallbackData';

export default function AIAssistant({ currentPage, started, freeReading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempKey, setTempKey] = useState('');
  const [backupApiKey, setBackupApiKey] = useState('');
  const [tempBackupKey, setTempBackupKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const chatEndRef = useRef(null);
  const prevIsOpenRef = useRef(isOpen);

  // Initialize and load API Key from LocalStorage & warm up speech voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }

    let savedKey = localStorage.getItem('gemini_api_key');
    if (!savedKey || savedKey === 'null' || savedKey === 'undefined' || !savedKey.startsWith('AIza')) {
      // Set the user's provided API key as default and save it
      savedKey = 'AIzaSyA5ixunTcowXo4Wg_HLzDdqC61RLoSNMe0';
      localStorage.setItem('gemini_api_key', savedKey);
    }

    let savedBackupKey = localStorage.getItem('gemini_api_key_backup');
    if (!savedBackupKey || savedBackupKey === 'null' || savedBackupKey === 'undefined' || !savedBackupKey.startsWith('AIza')) {
      savedBackupKey = 'AIzaSyAk4bLRQLR12ECZmsOkDd1ZplV--UyBy-A';
      localStorage.setItem('gemini_api_key_backup', savedBackupKey);
    }

    if (savedKey) {
      setApiKey(savedKey);
      setTempKey(savedKey);
      setBackupApiKey(savedBackupKey);
      setTempBackupKey(savedBackupKey);
      setShowSettings(false);
      // Welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: 'Xin chào! Tôi là Trợ lý Triết học AI. Tôi đã được kết nối và sẵn sàng giải thích nội dung trang sách hoặc thảo luận cùng bạn. Hãy nhấn vào các phím gợi ý nhanh bên dưới hoặc đặt câu hỏi tự do nhé!'
        }
      ]);
    } else {
      setShowSettings(true);
      setMessages([
        {
          id: 'welcome-no-key',
          role: 'assistant',
          text: 'Chào mừng bạn! Vui lòng nhập API Key từ Google AI Studio của bạn ở bảng phía trên để kích hoạt Trợ lý AI nhé!'
        }
      ]);
    }
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Handle saving the API key
  const handleSaveKey = () => {
    const trimmedKey = tempKey.trim();
    const trimmedBackupKey = tempBackupKey.trim();
    if (trimmedKey) {
      localStorage.setItem('gemini_api_key', trimmedKey);
      setApiKey(trimmedKey);
      localStorage.setItem('gemini_api_key_backup', trimmedBackupKey);
      setBackupApiKey(trimmedBackupKey);

      setShowSettings(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          text: 'Cấu hình khóa API thành công! Trợ lý AI đã sẵn sàng hỗ trợ bạn.'
        }
      ]);
    } else {
      alert('Vui lòng nhập mã API Key hợp lệ!');
    }
  };

  // Handle clearing the API key
  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('gemini_api_key_backup');
    setApiKey('');
    setTempKey('');
    setBackupApiKey('');
    setTempBackupKey('');
    setShowSettings(true);
    setMessages([
      {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        text: 'Đã xóa khóa API. Vui lòng nhập khóa mới để tiếp tục sử dụng Trợ lý AI.'
      }
    ]);
  };

  // Text-To-Speech reader function
  const handleSpeak = (text, msgId) => {
    unlockAudio();
    if (speakingMsgId === msgId) {
      cancelTTS();
      setSpeakingMsgId(null);
      return;
    }

    // Clean markdown characters before reading
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // remove bold asterisks
      .replace(/###\s+/g, '')            // remove ### headers
      .replace(/##\s+/g, '')             // remove ## headers
      .replace(/#\s+/g, '')              // remove # headers
      .replace(/^[\s*-]+/gm, '')         // remove bullets
      .trim();

    setSpeakingMsgId(msgId);
    playVietnameseSpeech(
      cleanText,
      () => {
        setSpeakingMsgId(null);
      },
      false
    );
  };

  // Cancel speech when closed (transition from open to closed only)
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      cancelTTS();
      setSpeakingMsgId(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    return () => {
      cancelTTS();
    };
  }, []);

  // Send prompt to Gemini API
  const handleSend = async (customPrompt = '', hiddenInstruction = '') => {
    unlockAudio();
    const promptToSend = customPrompt || inputVal.trim();
    if (!promptToSend) return;

    if (!apiKey) {
      alert('Vui lòng cấu hình API Key trước khi sử dụng!');
      setShowSettings(true);
      return;
    }

    // Add user message to state
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text: promptToSend
      }
    ]);

    if (!customPrompt) setInputVal('');
    setIsLoading(true);

    try {
      const pageText = typeof bookContent === 'function' ? bookContent(currentPage) : bookContent[currentPage] || 'Không rõ trang này.';

      const systemInstruction = `Bạn là Trợ lý Triết học AI chuyên nghiệp giảng dạy học phần Triết học Mác - Lênin tại Việt Nam.
Nhiệm vụ hàng đầu của bạn là trả lời đúng trọng tâm và chính xác câu hỏi của người dùng.
- Nếu người dùng đặt câu hỏi tự do (như chào hỏi, hỏi kiến thức chung, thảo luận triết học tự do), hãy tập trung trả lời chính xác câu hỏi đó của họ một cách trực tiếp.
- Chỉ khi người dùng yêu cầu giải thích, tóm tắt hoặc làm trắc nghiệm về trang sách hiện tại (Trang sách số ${currentPage}), bạn mới sử dụng nội dung trang sách dưới đây để phản hồi.
- Nếu bạn tạo câu hỏi trắc nghiệm ôn tập (gồm câu hỏi và 4 đáp án A, B, C, D), ở dòng cuối cùng của câu trả lời, bạn bắt buộc phải ghi chú đáp án đúng theo định dạng ẩn sau: |||CORRECT_ANSWER:X||| (trong đó X là đáp án đúng A, B, C hoặc D, không có khoảng cách hay ký tự thừa).
- Tuyệt đối KHÔNG sử dụng các ký tự LaTeX như $\\rightarrow$, \\rightarrow hay $\\to$ để vẽ mũi tên. Hãy thay thế bằng ký tự unicode mũi tên thông thường "→" hoặc các từ chuyển ý như "dẫn đến", "suy ra".
Nội dung trang sách hiện tại (chỉ dùng để tham khảo khi cần thiết hoặc khi được yêu cầu):
---
${pageText}
---
Yêu cầu về phản hồi: Trả lời khoa học, ngắn gọn, dễ hiểu, sử dụng ví dụ thực tiễn. Định dạng Markdown rõ ràng. Trả lời bằng Tiếng Việt.`;

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemInstruction}\n\nCâu hỏi/Yêu cầu của người dùng: ${promptToSend}${hiddenInstruction ? '\n' + hiddenInstruction : ''}`
              }
            ]
          }
        ]
      };

      const modelsToTry = [
        { name: 'gemini-3.5-flash', version: 'v1beta' },
        { name: 'gemini-2.5-flash', version: 'v1beta' },
        { name: 'gemini-2.5-flash-lite', version: 'v1beta' },
        { name: 'gemini-2.0-flash', version: 'v1beta' },
        { name: 'gemini-2.0-flash-exp', version: 'v1beta' },
        { name: 'gemini-2.5-pro', version: 'v1beta' }
      ];

      const keysToTry = [apiKey];
      if (backupApiKey && backupApiKey.trim() && backupApiKey.trim() !== apiKey) {
        keysToTry.push(backupApiKey.trim());
      }

      let response = null;
      let lastError = null;
      let succeeded = false;

      for (let k = 0; k < keysToTry.length; k++) {
        const currentKey = keysToTry[k];

        for (let i = 0; i < modelsToTry.length; i++) {
          const m = modelsToTry[i];
          let attempts = 0;
          const maxAttempts = 3;

          while (attempts < maxAttempts) {
            try {
              const url = `https://generativelanguage.googleapis.com/${m.version}/models/${m.name}:generateContent?key=${currentKey}`;
              const res = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
              });

              if (res.ok) {
                response = res;
                succeeded = true;
                console.log(`Successfully generated content using model: ${m.name} (${m.version}) with Key index ${k}`);
                break;
              } else {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.error?.message || `Mô hình ${m.name} trả về lỗi (Trạng thái ${res.status})`;
                console.warn(`Model ${m.name} (${m.version}) attempt ${attempts + 1} with Key index ${k} failed:`, errMsg);

                if (res.status === 429 && attempts < maxAttempts - 1) {
                  console.log(`Rate limited (429) on ${m.name}. Retrying in 1.5 seconds...`);
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  attempts++;
                  continue;
                }

                lastError = new Error(errMsg);
                break;
              }
            } catch (err) {
              console.warn(`Fetch error for model ${m.name} (${m.version}) with Key index ${k}:`, err);
              lastError = err;
              break;
            }
          }

          if (succeeded) {
            break;
          }
        }

        if (succeeded) {
          break;
        } else {
          console.warn(`Key index ${k} failed entirely. Trying next key if available.`);
        }
      }

      if (!succeeded) {
        throw lastError || new Error("Không thể kết nối đến Gemini API.");
      }

      const data = await response.json();
      const replyText = data.candidates[0].content.parts[0].text;

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: replyText
        }
      ]);
    } catch (err) {
      console.error("API Call failed. Using fallback data if applicable.", err);

      const pageIndex = Number(currentPage);
      const fallback = fallbackData[pageIndex];
      let isFallbackHandled = false;
      let fallbackText = '';

      if (fallback) {
        if (promptToSend.includes('giải thích chi tiết nội dung')) {
          fallbackText = `⚠️ **[Chế độ ngoại tuyến]** Không thể kết nối với AI. Dưới đây là nội dung giải thích chi tiết được chuẩn bị sẵn:\n\n${fallback.explain}`;
          isFallbackHandled = true;
        } else if (promptToSend.includes('tóm tắt ngắn gọn')) {
          fallbackText = `⚠️ **[Chế độ ngoại tuyến]** Không thể kết nối với AI. Dưới đây là tóm tắt bài học được chuẩn bị sẵn:\n\n${fallback.summary}`;
          isFallbackHandled = true;
        } else if (promptToSend.includes('câu hỏi trắc nghiệm ôn tập')) {
          const quizIndex = Math.floor(Math.random() * fallback.quiz.length);
          const q = fallback.quiz[quizIndex];
          fallbackText = `⚠️ **[Chế độ ngoại tuyến]** Không thể kết nối với AI. Dưới đây là câu hỏi trắc nghiệm được chuẩn bị sẵn:\n\n### Câu hỏi ôn tập (Offline):\n${q.question}\n${q.options.join('\n')}\n|||CORRECT_ANSWER:${q.correct}|||`;
          isFallbackHandled = true;
        } else if (promptToSend.includes('ví dụ thực tế liên quan')) {
          fallbackText = `⚠️ **[Chế độ ngoại tuyến]** Không thể kết nối với AI. Dưới đây là ví dụ thực tế được chuẩn bị sẵn:\n\n${fallback.example}`;
          isFallbackHandled = true;
        }
      }

      if (isFallbackHandled) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-offline-${Date.now()}`,
            role: 'assistant',
            text: fallbackText
          }
        ]);
      } else {
        const pageText = typeof bookContent === 'function' ? bookContent(currentPage) : bookContent[currentPage] || '';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: `❌ **Không thể kết nối đến AI:** ${err.message || 'Đã có lỗi xảy ra.'}\n\n⚠️ **[Chế độ ngoại tuyến]** Do không có kết nối API, bạn có thể tham khảo nội dung gốc của trang sách hiện tại dưới đây:\n\n${pageText}`
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse bold text **text** into JSX styled bold
  const parseBold = (text) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-red-300">{part}</strong>;
      }
      return part;
    });
  };

  // Simple and lightweight renderer to format markdown tags cleanly into React JSX
  const formatMessageText = (text, msgId) => {
    if (!text) return '';

    // Find correct answer from hidden tag
    const correctMatch = text.match(/\|\|\|CORRECT_ANSWER:\s*([A-D])\s*\|\|\|/i);
    const correctAnswer = correctMatch ? correctMatch[1].toUpperCase() : null;

    // Clean text by removing correct answer tag and replacing LaTeX arrows
    let cleanText = text
      .replace(/\|\|\|CORRECT_ANSWER:\s*[A-D]\s*\|\|\|/gi, '')
      .replace(/\$\s*\\rightarrow\s*\$/g, '→')
      .replace(/\$\s*\\to\s*\$/g, '→')
      .replace(/\\rightarrow/g, '→')
      .replace(/\\to/g, '→')
      .trim();

    const lines = cleanText.split('\n');
    return lines.map((line, idx) => {
      // Check if it's a quiz option (A, B, C, D)
      const optionMatch = line.trim().match(/^[-*\s]*\b([A-D])\b\s*[\.\):-]\s*(.*)$/i);
      if (optionMatch) {
        const letter = optionMatch[1].toUpperCase();
        const content = optionMatch[2];

        // Determine button style based on selected and correct answers
        const selected = selectedAnswers[msgId];
        let btnClass = "bg-[#2a2a28] hover:bg-[#3a3a38] border-white/5 hover:border-[#b22222]/60 cursor-pointer active:scale-[0.98] text-gray-200 hover:text-white";
        let badgeClass = "bg-[#1c1c1a] group-hover:bg-[#b22222] text-gray-300 group-hover:text-white";

        if (selected) {
          if (letter === correctAnswer) {
            // Correct answer is always green once selected
            btnClass = "bg-green-950/30 border-green-500/40 text-green-200 cursor-default";
            badgeClass = "bg-green-500 text-white font-bold";
          } else if (letter === selected) {
            // Wrong answer selected is red
            btnClass = "bg-red-950/30 border-red-500/40 text-red-200 cursor-default";
            badgeClass = "bg-red-500 text-white font-bold";
          } else {
            // Other options are disabled
            btnClass = "bg-[#1c1c1a]/50 border-white/5 text-gray-500 cursor-default opacity-50";
            badgeClass = "bg-white/5 text-gray-600";
          }
        }

        return (
          <button
            key={idx}
            disabled={!!selected}
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering parent text-to-speech speaker
              if (selected) return;
              setSelectedAnswers(prev => ({ ...prev, [msgId]: letter }));
            }}
            className={`w-full text-left my-2 p-2.5 rounded-xl border flex items-center gap-3 transition-all duration-200 group ${btnClass}`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border border-white/10 transition-colors ${badgeClass}`}>
              {letter}
            </span>
            <span className="flex-1 text-xs md:text-sm transition-colors">
              {parseBold(content)}
            </span>
          </button>
        );
      }

      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-sm md:text-base font-bold text-red-400 mt-3 mb-1 font-serif">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-base md:text-lg font-bold text-red-400 mt-4 mb-2 font-serif">{line.replace('## ', '')}</h3>;
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletContent = line.replace(/^[\s*-]+/, '').trim();
        return (
          <li key={idx} className="ml-4 list-disc text-xs md:text-sm text-gray-300 my-1 leading-relaxed font-sans">
            {parseBold(bulletContent)}
          </li>
        );
      }
      return (
        <p key={idx} className="text-xs md:text-sm text-gray-200 my-1 leading-relaxed min-h-[1em] font-sans">
          {parseBold(line)}
        </p>
      );
    });
  };

  if (!started || !freeReading) return null;

  return (
    <>
      {/* Floating Toggle Button (Pulse Glow Glow Red) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-36 right-6 z-[999] pointer-events-auto flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-[#b22222] to-[#ff4500] hover:from-[#8b0000] hover:to-[#ff0000] text-white rounded-full shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group"
          title="Trợ lý Triết học AI"
        >
          <div className="relative">
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
          </div>
        </button>
      )}

      {/* Side Slide-Out Chat Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 z-[998] pointer-events-auto bg-[#161615]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-500 ease-out font-sans ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header Block */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#b22222]/20 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#32cd32] animate-pulse"></div>
            <div>
              <span className="text-white font-serif font-bold text-base leading-tight block" style={{ color: '#ffffff' }}>
                Trợ lý Triết học AI
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center"
            title="Đóng Trợ lý"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* API Settings Overlay */}
        {showSettings && (
          <div className="p-5 bg-[#222220] border-b border-white/10 flex flex-col gap-3 text-sm text-gray-300">
            <div className="font-serif font-semibold text-white">Cấu hình Google AI Studio API Key</div>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              Dán API key từ tài khoản Google AI Studio để kết nối. Các khóa được lưu trữ an toàn tại trình duyệt của bạn (LocalStorage).
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">API Key Chính</label>
              <input
                type="password"
                placeholder="Dán API Key chính tại đây..."
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className="w-full bg-[#121210] border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-[#b22222] font-mono text-xs shadow-inner"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">API Key Dự Phòng (Tùy chọn)</label>
              <input
                type="password"
                placeholder="Dán API Key dự phòng tại đây..."
                value={tempBackupKey}
                onChange={(e) => setTempBackupKey(e.target.value)}
                className="w-full bg-[#121210] border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-[#b22222] font-mono text-xs shadow-inner"
              />
            </div>
            <div className="flex gap-2 justify-end mt-1">
              {apiKey && (
                <button
                  onClick={handleClearKey}
                  className="px-3 py-1.5 rounded bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-red-950/50 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Xóa Khóa
                </button>
              )}
              <button
                onClick={handleSaveKey}
                className="px-4 py-1.5 rounded bg-[#b22222] hover:bg-[#8b0000] text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Lưu Cấu Hình
              </button>
            </div>
          </div>
        )}

        {/* Scrolling Chat Container */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
                }`}
            >
              {/* Message bubble */}
              <div
                onClick={() => handleSpeak(msg.text, msg.id)}
                className={`px-4 py-3 rounded-2xl shadow-sm text-sm cursor-pointer transition-all duration-300 select-none hover:shadow-md active:scale-[0.98] ${msg.role === 'user'
                  ? 'bg-[#b22222] text-white rounded-br-none shadow-black/20'
                  : 'bg-[#222220] text-gray-100 rounded-bl-none border border-white/5 shadow-inner'
                  } ${speakingMsgId === msg.id
                    ? 'ring-2 ring-yellow-500 border-yellow-500/50 shadow-md shadow-yellow-500/10'
                    : ''
                  }`}
                title="Nhấn để nghe đọc bằng tiếng Việt"
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                ) : (
                  <div>
                    {formatMessageText(msg.text, msg.id)}
                  </div>
                )}
              </div>

              {/* Speak button for AI Responses */}
              {msg.role === 'assistant' && msg.id !== 'welcome-no-key' && (
                <button
                  onClick={() => handleSpeak(msg.text, msg.id)}
                  className={`mt-1.5 flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider cursor-pointer hover:text-white transition-colors ${speakingMsgId === msg.id ? 'text-[#ffd700] animate-pulse' : 'text-gray-400'
                    }`}
                >
                  {speakingMsgId === msg.id ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                      Dừng đọc giọng nói
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
                      </svg>
                      Đọc câu trả lời
                    </>
                  )}
                </button>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="self-start flex gap-2 items-center px-4 py-3.5 rounded-2xl bg-[#222220] text-gray-400 text-xs border border-white/5">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick prompt suggestions row */}
        {apiKey && !isLoading && (
          <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-white/5 bg-[#0e0e0d]">
            <button
              onClick={() => handleSend('Hãy giải thích chi tiết nội dung của trang sách hiện tại này cho tôi hiểu sâu sắc hơn.')}
              className="px-2.5 py-1.5 rounded-full bg-[#222220] hover:bg-white/10 text-gray-300 text-xs font-medium cursor-pointer border border-white/5 transition-all active:scale-95 shadow-sm"
            >
              💡 Giải thích trang này
            </button>
            <button
              onClick={() => handleSend('Hãy tóm tắt ngắn gọn các luận điểm cốt lõi nhất của trang sách hiện tại này thành các gạch đầu dòng ngắn.')}
              className="px-2.5 py-1.5 rounded-full bg-[#222220] hover:bg-white/10 text-gray-300 text-xs font-medium cursor-pointer border border-white/5 transition-all active:scale-95 shadow-sm"
            >
              📝 Tóm tắt bài học
            </button>
            <button
              onClick={() => handleSend(
                'Hãy tạo 1 câu hỏi trắc nghiệm ôn tập trắc nghiệm ngắn (gồm câu hỏi và 4 đáp án A, B, C, D) dựa trên nội dung trang sách hiện tại này.',
                'Đừng đưa đáp án ngay mà hãy bảo tôi chọn. QUAN TRỌNG: Ở dòng cuối cùng của câu trả lời, bạn bắt buộc phải ghi chú đáp án đúng theo định dạng ẩn sau: |||CORRECT_ANSWER:X||| (trong đó X là đáp án đúng A, B, C hoặc D).'
              )}
              className="px-2.5 py-1.5 rounded-full bg-[#222220] hover:bg-white/10 text-gray-300 text-xs font-medium cursor-pointer border border-white/5 transition-all active:scale-95 shadow-sm"
            >
              ❓ Đố vui trắc nghiệm
            </button>
            <button
              onClick={() => handleSend('Hãy đưa ra ví dụ thực tế liên quan đến nội dung của trang sách hiện tại này để tôi dễ hình dung hơn.')}
              className="px-2.5 py-1.5 rounded-full bg-[#222220] hover:bg-white/10 text-gray-300 text-xs font-medium cursor-pointer border border-white/5 transition-all active:scale-95 shadow-sm"
            >
              🔍 Ví dụ thực tế
            </button>
          </div>
        )}

        {/* Chat input block */}
        <div className="p-4 border-t border-white/10 bg-[#121210]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder={apiKey ? "Đặt câu hỏi về trang sách..." : "Vui lòng nhập API Key trước..."}
              disabled={!apiKey || isLoading}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 bg-[#222220] text-white border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#b22222] disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
            />
            <button
              type="submit"
              disabled={!apiKey || isLoading || !inputVal.trim()}
              className="w-10 h-10 rounded-full bg-[#b22222] hover:bg-[#8b0000] text-white flex items-center justify-center shadow-md cursor-pointer transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
