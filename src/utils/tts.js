// Shared Vietnamese TTS Player with Gemini 3.1 Flash TTS, BCP-47 configuration, and robust fallbacks
let currentAudio = null;
let currentSessionId = 0;
let sharedAudioContext = null;

// Cache map: pageIndex -> { floatSamples, sampleRate }
const audioCache = {};

// Simple IndexedDB wrapper for caching page audio persistently
const DB_NAME = "PopUpPhilosophyTTS";
const DB_VERSION = 1;
const STORE_NAME = "audioCache";

const openDB = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => {
        resolve(e.target.result);
      };
      request.onerror = (e) => {
        console.warn("[TTS DB] Failed to open IndexedDB:", e);
        resolve(null);
      };
    } catch (err) {
      console.warn("[TTS DB] Exception opening IndexedDB:", err);
      resolve(null);
    }
  });
};

const getCachedAudioFromDB = async (pageIndex) => {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(pageIndex);
      request.onsuccess = (e) => {
        resolve(e.target.result || null);
      };
      request.onerror = () => {
        resolve(null);
      };
    } catch (err) {
      resolve(null);
    }
  });
};

const saveAudioToDB = async (pageIndex, audioData) => {
  const db = await openDB();
  if (!db) return;
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(audioData, pageIndex);
  } catch (err) {
    console.warn("[TTS DB] Failed to save audio to IndexedDB:", err);
  }
};

const getSharedAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        sharedAudioContext = new AudioContextClass();
      } catch (e) {
        console.warn("[TTS] Failed to create shared AudioContext:", e);
      }
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch((e) => console.warn("[TTS] Failed to resume AudioContext:", e));
  }
  return sharedAudioContext;
};

export const unlockAudio = () => {
  console.log("[TTS] Unlocking browser audio context...");

  // 1. Unlock Web Audio API
  const ctx = getSharedAudioContext();
  if (ctx) {
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      console.warn("[TTS] Failed to unlock Web Audio context:", e);
    }
  }

  // 2. Unlock HTML5 Audio Elements (Google Translate TTS)
  try {
    const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA");
    silentAudio.play().catch((err) => {
      console.warn("[TTS] Silent audio playback blocked or failed:", err);
    });
  } catch (e) {
    console.warn("[TTS] Failed to create silent audio element:", e);
  }

  // 3. Unlock SpeechSynthesis
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.resume();
      // Speak a silent space to initialize voice engine
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn("[TTS] Failed to unlock SpeechSynthesis:", e);
    }
  }
};

export const cancelTTS = () => {
  currentSessionId++; // Invalidate previous async sessions
  if (window.currentPCMSource) {
    try {
      window.currentPCMSource.stop();
    } catch (e) { }
    window.currentPCMSource = null;
  }
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch (e) { }
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};



// Fallback to Google Translate TTS
const playFallbackSpeech = (cleanText, onEnd, isMuted, sessionId) => {
  if (isMuted) return;
  if (sessionId !== currentSessionId) return;

  // Split into chunks of max 140 characters, at word boundaries, to avoid Google's 200-char limit
  const splitTextIntoChunks = (text, maxLen = 140) => {
    const phrases = text
      .replace(/([.?!:;\n])\s*/g, "$1|")
      .split("|")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const tempChunks = [];
    for (const phrase of phrases) {
      if (phrase.length <= maxLen) {
        tempChunks.push(phrase);
      } else {
        const words = phrase.split(/\s+/);
        let currentPhrase = "";
        for (const word of words) {
          if ((currentPhrase + " " + word).trim().length <= maxLen) {
            currentPhrase = currentPhrase ? currentPhrase + " " + word : word;
          } else {
            if (currentPhrase) tempChunks.push(currentPhrase);
            currentPhrase = word;
          }
        }
        if (currentPhrase) tempChunks.push(currentPhrase);
      }
    }

    const merged = [];
    let temp = "";
    for (const chunk of tempChunks) {
      if ((temp + " " + chunk).trim().length <= maxLen) {
        temp = temp ? temp + " " + chunk : chunk;
      } else {
        if (temp) merged.push(temp);
        temp = chunk;
      }
    }
    if (temp) merged.push(temp);
    return merged;
  };

  const chunks = splitTextIntoChunks(cleanText, 140);

  if (chunks.length === 0) {
    if (sessionId !== currentSessionId) return;
    if (onEnd) onEnd();
    return;
  }

  let index = 0;
  const preloadedAudios = {};

  const playGoogleTTS = async () => {
    if (sessionId !== currentSessionId) return;

    if (index >= chunks.length) {
      if (sessionId !== currentSessionId) return;
      if (onEnd) onEnd();
      return;
    }

    const textChunk = chunks[index];
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=gtx&q=${encodeURIComponent(textChunk)}`;

    // Retrieve preloaded audio or create a fresh one
    const audio = preloadedAudios[index] || new Audio(url);
    audio.playbackRate = 1.25; // Speed up Google Translate TTS
    audio.onplay = () => {
      if (sessionId !== currentSessionId) return;
      audio.playbackRate = 1.25;
    };
    currentAudio = audio;

    let fallbackTriggered = false;
    const triggerFallback = async (reason, err = null) => {
      if (sessionId !== currentSessionId) return;
      if (fallbackTriggered) return;
      fallbackTriggered = true;

      console.warn(`[TTS] Google TTS chunk ${index} failed (${reason}). Skipping chunk.`, err || "");

      // Cleanup the current audio listeners
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      audio.onplay = null;
      try {
        audio.pause();
      } catch (e) { }

      // Skip this chunk and move to next
      index++;
      playGoogleTTS();
    };

    // Timeout fallback: if Google TTS fails to start, skip this chunk
    let loadTimeout = setTimeout(() => {
      if (sessionId !== currentSessionId) return;
      triggerFallback("timeout");
    }, 4500); // Increased to 4.5s for slow mobile networks

    audio.onplaying = () => {
      if (sessionId !== currentSessionId) return;
      clearTimeout(loadTimeout);
    };

    audio.onended = () => {
      if (sessionId !== currentSessionId) return;
      clearTimeout(loadTimeout);
      if (fallbackTriggered) return;
      index++;
      playGoogleTTS();
    };

    audio.onerror = (err) => {
      if (sessionId !== currentSessionId) return;
      clearTimeout(loadTimeout);
      triggerFallback("error", err);
    };

    audio.play()
      .then(() => {
        if (sessionId !== currentSessionId) {
          try {
            audio.pause();
          } catch (e) { }
          return;
        }
        clearTimeout(loadTimeout); // Clear timeout when browser successfully begins playback

        // Safely preload only the *immediate next* chunk after 1.5 seconds delay (prevents Google TTS spam blocks)
        if (index + 1 < chunks.length && !preloadedAudios[index + 1]) {
          setTimeout(() => {
            if (sessionId !== currentSessionId) return;
            const nextChunk = chunks[index + 1];
            const nextUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=gtx&q=${encodeURIComponent(nextChunk)}`;
            const nextAudio = new Audio(nextUrl);
            nextAudio.preload = "auto";
            preloadedAudios[index + 1] = nextAudio;
          }, 1500);
        }
      })
      .catch((err) => {
        if (sessionId !== currentSessionId) return;
        clearTimeout(loadTimeout);
        // AbortError is triggered when pause() is called. Only trigger fallback if it wasn't already triggered.
        if (err && err.name === 'AbortError') {
          return;
        }
        triggerFallback("play_catch", err);
      });
  };

  playGoogleTTS();
};

// Fetch and decode API response from Gemini (tries primary key first, then falls back to backup key)
const fetchGeminiAudio = async (text, apiKey, backupApiKey = '') => {
  const modelsToTry = [
    { name: 'gemini-2.5-flash', version: 'v1beta' },
    { name: 'gemini-2.5-flash-lite', version: 'v1beta' },
    { name: 'gemini-2.0-flash', version: 'v1beta' },
    { name: 'gemini-2.0-flash-exp', version: 'v1beta' },
    { name: 'gemini-2.5-pro', version: 'v1beta' }
  ];

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: text
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        languageCode: "vi",
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede"
          }
        }
      }
    }
  };

  const keysToTry = [apiKey];
  if (backupApiKey && backupApiKey.trim() && backupApiKey.trim() !== apiKey) {
    keysToTry.push(backupApiKey.trim());
  }

  let responseData = null;
  let succeeded = false;
  let lastError = null;

  for (let k = 0; k < keysToTry.length; k++) {
    const currentKey = keysToTry[k];
    for (let i = 0; i < modelsToTry.length; i++) {
      const m = modelsToTry[i];
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
          responseData = await res.json();
          succeeded = true;
          console.log(`Successfully generated audio using model: ${m.name} (${m.version}) with Key index ${k}`);
          break;
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Mô hình ${m.name} trả về lỗi (Trạng thái ${res.status})`;
          console.warn(`Model ${m.name} (${m.version}) with Key index ${k} failed:`, errMsg);
          lastError = new Error(errMsg);
        }
      } catch (err) {
        console.warn(`Fetch error for model ${m.name} (${m.version}) with Key index ${k}:`, err);
        lastError = err;
      }
    }
    if (succeeded) {
      break;
    } else {
      console.warn(`Audio API Call: Key index ${k} failed entirely. Trying next key if available.`);
    }
  }

  if (!succeeded) {
    throw lastError || new Error("All Gemini models failed to generate audio.");
  }

  const audioBytes = responseData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioBytes) {
    throw new Error("No inline audio data found in response");
  }

  const mimeType = responseData.candidates[0].content.parts[0].inlineData.mimeType || 'audio/l16; rate=24000; channels=1';
  let sampleRate = 24000;
  if (mimeType.includes('rate=')) {
    const rateMatch = mimeType.match(/rate=(\d+)/);
    if (rateMatch) {
      sampleRate = parseInt(rateMatch[1], 10);
    }
  }

  // Convert base64 to binary array
  const binaryString = window.atob(audioBytes);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert PCM 16-bit to Float32 Array
  const buffer = bytes.buffer;
  const view = new DataView(buffer);
  const numSamples = buffer.byteLength / 2;
  const floatSamples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const int16 = view.getInt16(i * 2, true);
    floatSamples[i] = int16 / 32768.0;
  }

  return { floatSamples, sampleRate };
};

// Play audio from pre-decoded float samples
const playPCMBuffer = (audioData, onEnd, sessionId) => {
  const { floatSamples, sampleRate } = audioData;
  const audioCtx = getSharedAudioContext();
  if (!audioCtx) {
    throw new Error("Web Audio API not supported");
  }

  // Stop any active PCM source before playing new one
  if (window.currentPCMSource) {
    try {
      window.currentPCMSource.stop();
    } catch (e) { }
    window.currentPCMSource = null;
  }

  const audioBuffer = audioCtx.createBuffer(1, floatSamples.length, sampleRate);
  audioBuffer.getChannelData(0).set(floatSamples);

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);

  currentAudio = null;
  window.currentPCMSource = source;

  source.onended = () => {
    if (sessionId !== currentSessionId) return;
    if (onEnd) onEnd();
  };

  source.playbackRate.value = 1.25; // Speed up Web Audio API PCM playback
  source.start(0);
};

// Clean text for better speech pronunciation
const cleanBookText = (text) => {
  if (!text) return '';
  return text
    // Replace names for better pronunciation
    .replace(/Mác\s*[\u2013\u2014-]\s*Lênin/gi, 'Mác Lê-nin')
    .trim();
};

// Single page prefetch function (No-op since Gemini is disabled)
export const prefetchPageAudio = async (pageIndex, apiKey, backupApiKey = '') => {
  return null;
};

// Prefetch all book pages sequentially in the background (No-op since Gemini is disabled)
export const prefetchBookAudio = async () => {
  console.log("[TTS] Prefetching bypassed as Gemini TTS is disabled.");
};

export const playVietnameseSpeech = async (text, onEnd, isMuted, pageIndex = null) => {
  cancelTTS();
  const sessionId = currentSessionId;
  if (isMuted) return;

  const cleanText = cleanBookText(text);

  // Directly play fallback speech (Google Translate -> Web Speech API)
  playFallbackSpeech(cleanText, onEnd, isMuted, sessionId);
};
