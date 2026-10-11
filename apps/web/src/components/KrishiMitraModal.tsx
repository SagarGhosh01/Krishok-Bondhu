import React, { useState, useEffect, useRef } from "react";
import { X, Send, Mic, MicOff, Volume2, VolumeX, Bot, Sparkles, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface KrishiMitraModalProps {
  isOpen: boolean;
  onClose: () => void;
  diseaseContext?: string;
  cropContext?: string;
}

interface Message {
  sender: "user" | "bot";
  text: string;
  takeaways?: string[];
}

export const KrishiMitraModal: React.FC<KrishiMitraModalProps> = ({
  isOpen,
  onClose,
  diseaseContext,
  cropContext,
}) => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested questions based on language
  const suggestedQuestions =
    i18n.language === "bn"
      ? [
          "জৈব পদ্ধতিতে কীভাবে প্রতিকার করব?",
          "কীভাবে সঠিক সেচ দেব?",
          "আক্রান্ত পাতা ছাঁটাই করার নিয়ম কী?",
        ]
      : i18n.language === "hi"
      ? [
          "जैविक उपचार की सही विधि क्या है?",
          "सिंचाई का सही समय और तरीका क्या है?",
          "संक्रमित पत्तियों को कैसे नष्ट करें?",
        ]
      : [
          "How do I apply organic neem spray?",
          "What is the best irrigation timing?",
          "How should I prune infected leaves?",
        ];

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const intro =
        i18n.language === "bn"
          ? `নমস্কার! আমি কৃষি মিত্র, আপনার এআই কৃষি সহায়ক। ${
              diseaseContext ? `আপনার চিহ্নিত রোগ: ${diseaseContext}।` : ""
            } আপনি কি জৈব প্রতিকার বা সেচ সম্পর্কিত কোনো প্রশ্ন করতে চান?`
          : i18n.language === "hi"
          ? `नमस्ते! मैं कृषि मित्र, आपका एआई कृषि सहायक हूं। ${
              diseaseContext ? `पहचाना गया रोग: ${diseaseContext}।` : ""
            } क्या आप जैविक उपचार या सिंचाई के बारे में कुछ पूछना चाहते हैं?`
          : `Hello! I am Krishi Mitra, your AI Agronomy Advisor. ${
              diseaseContext ? `Current diagnosis context: ${diseaseContext}.` : ""
            } Ask me about organic treatments, irrigation, or ICAR recommendations.`;

      setMessages([{ sender: "bot", text: intro }]);
    }
  }, [isOpen, diseaseContext, i18n.language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Speech Recognition Setup
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your query.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = i18n.language === "bn" ? "bn-IN" : i18n.language === "hi" ? "hi-IN" : "en-IN";

    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      handleSendMessage(transcript);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  // Text to Speech
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === "bn" ? "bn-IN" : i18n.language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const q = textToSend || inputText;
    if (!q.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: q }]);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          language: i18n.language || "en",
          disease_context: diseaseContext,
          crop_context: cropContext,
        }),
      });

      if (!response.ok) throw new Error("Assistant response failed");
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.reply,
          takeaways: data.key_takeaways,
        },
      ]);

      // Auto-read response
      speakText(data.audio_text);
    } catch (err) {
      // Local fallback
      const fallback =
        i18n.language === "bn"
          ? "সতর্কতা: জৈব প্রতিকারের জন্য নিম বীজের নির্যাস (৫% NSKE) বা ট্রাইকোডার্মা ব্যবহার করুন। বিস্তারিত জানতে স্থানীয় কৃষি বিজ্ঞান কেন্দ্রে (KVK) যোগাযোগ করুন।"
          : i18n.language === "hi"
          ? "चेतावनी: जैविक उपचार हेतु 5% नीम अर्क या ट्राइकोडर्मा विरिडी का प्रयोग करें। अतिरिक्त सलाह हेतु नजदीकी कृषि विज्ञान केंद्र (KVK) से संपर्क करें।"
          : "Advice: Apply 5% Neem Seed Kernel Extract (NSKE) or Trichoderma viride in the late evening. Consult local Krishi Vigyan Kendra (KVK) for certified schedules.";

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: fallback,
          takeaways: ["Use certified bio-fungicides", "Consult local extension officer"],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-4xl w-full max-w-lg shadow-2xl border border-agri-border flex flex-col h-[85vh] max-h-[680px] overflow-hidden">
        {/* Header */}
        <div className="bg-[#232B25] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-agri-primary flex items-center justify-center text-white shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-1.5">
                Krishi Mitra <Sparkles className="w-4 h-4 text-agri-accent" />
              </h3>
              <p className="text-xs text-white/60">
                {t("advanced.assistant_voice_btn", "Voice Agronomist")} (ICAR Aligned)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isSpeaking) window.speechSynthesis.cancel();
              onClose();
            }}
            className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAF7]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.sender === "user"
                    ? "bg-agri-primary text-white rounded-br-none"
                    : "bg-white text-agri-text border border-agri-border/60 rounded-bl-none"
                }`}
              >
                <p>{m.text}</p>

                {m.takeaways && m.takeaways.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-stone-200/80 space-y-1">
                    <p className="text-xs font-semibold text-agri-primary">Key Takeaways:</p>
                    <ul className="text-xs text-stone-600 list-disc pl-4 space-y-0.5">
                      {m.takeaways.map((point, pIdx) => (
                        <li key={pIdx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {m.sender === "bot" && (
                <button
                  onClick={() => speakText(m.text)}
                  className="mt-1 text-xs text-stone-500 hover:text-agri-primary flex items-center gap-1 px-2 py-0.5"
                >
                  {isSpeaking ? (
                    <VolumeX className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isSpeaking ? "Stop" : "Listen"}</span>
                </button>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-stone-400 text-xs py-2">
              <div className="w-2 h-2 rounded-full bg-agri-primary animate-ping" />
              <span>Krishi Mitra is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-4 py-2 bg-white border-t border-agri-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-xs whitespace-nowrap bg-agri-bg hover:bg-stone-200/60 text-stone-700 px-3 py-1.5 rounded-full border border-agri-border transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-agri-border flex items-center gap-2">
          <button
            onClick={toggleListening}
            className={`p-2.5 rounded-full transition shadow-sm ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
            title="Speak query"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={
              i18n.language === "bn"
                ? "এখানে আপনার প্রশ্ন লিখুন..."
                : i18n.language === "hi"
                ? "यहाँ अपना प्रश्न लिखें..."
                : "Ask Krishi Mitra agronomy advice..."
            }
            className="flex-1 bg-stone-100 border border-stone-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-agri-primary"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            className="bg-agri-primary hover:bg-agri-primaryHover disabled:opacity-40 text-white p-2.5 rounded-full shadow-md transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
