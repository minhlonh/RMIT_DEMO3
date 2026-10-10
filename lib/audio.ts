// 1. Text-to-Speech (Máy đọc văn bản cho người lớn tuổi nghe)
export const speakText = (text: string, lang: string = 'vi-VN') => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

// 2. Speech-to-Text (Nói thành văn bản - Bấm nói, máy tự ghi chữ)
export const startVoiceRecognition = (
  onResult: (transcript: string) => void,
  onError?: (error: string) => void,
  lang: string = 'vi-VN'
) => {
  if (typeof window === 'undefined') return;

  // Kiểm tra trình duyệt có hỗ trợ Web Speech API không
  const SpeechRecognition = 
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError('Trình duyệt của bạn không hỗ trợ tính năng nhận diện giọng nói.');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.interimResults = false; // Chỉ lấy kết quả cuối cùng khi nói xong
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event: any) => {
    if (onError) onError(event.error);
  };

  try {
    recognition.start();
  } catch (error) {
    console.error('Speech recognition error:', error);
  }
};