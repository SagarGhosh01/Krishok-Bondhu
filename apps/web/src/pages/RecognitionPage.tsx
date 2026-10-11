import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Camera, Image as ImageIcon, Sparkles, AlertTriangle, CheckCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { submitPrediction } from "../services/api";
import { db } from "../db/indexedDb";

export const RecognitionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [cameraActive, setCameraActive] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker for offline edge inference
  useEffect(() => {
    try {
      const worker = new Worker(new URL("../workers/inference.worker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      worker.postMessage({ type: "INIT" });

      worker.onmessage = async (e) => {
        const { type, success, outcome, error } = e.data;
        if (type === "INFERENCE_RESULT") {
          if (!success) {
            setAnalyzing(false);
            setQualityWarning(error || "Local inference error.");
            return;
          }

          if (outcome.state === "CANNOT_ASSESS") {
            setAnalyzing(false);
            setQualityWarning(outcome.message || "Image rejected due to optical quality.");
            return;
          }

          // Save scan locally to Dexie
          const localId = "offline_" + Date.now();
          await db.scans.add({
            id: localId,
            imageData: capturedImage || "",
            originalFilename: "capture.jpg",
            crop: selectedCrop || "Tomato",
            disease: outcome.primaryClass,
            confidence: outcome.confidence,
            reliability: outcome.reliability,
            diagnosticState: outcome.state,
            isOfflinePending: true,
            createdAt: new Date().toISOString(),
          });

          await db.pendingSync.add({
            clientUuid: localId,
            imageBase64: capturedImage || "",
            originalFilename: "capture.jpg",
            selectedCrop: selectedCrop,
            clientPredictedClass: outcome.primaryClass,
            clientConfidence: outcome.confidence,
            createdAt: new Date().toISOString(),
            retryCount: 0,
          });

          setAnalyzing(false);
          // Navigate to result
          navigate(`/result?scan_id=${localId}&offline=true`);
        }
      };
    } catch (e) {
      console.warn("Web worker not available:", e);
    }

    return () => {
      workerRef.current?.terminate();
      stopCamera();
    };
  }, [capturedImage, selectedCrop]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable, fallback to file picker:", err);
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
    processCapturedImage(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      processCapturedImage(dataUrl, file);
    };
    reader.readAsDataURL(file);
  };

  // Real pipeline stages (Quality Check -> Preprocessing -> Inference -> Explainability)
  const processCapturedImage = async (dataUrl: string, fileObj?: File) => {
    setAnalyzing(true);
    setQualityWarning(null);

    // Stage 1: Quality Check
    setAnalysisStage(t("recognition.stage_quality"));
    setProgressPercent(25);
    await new Promise((r) => setTimeout(r, 200));

    // Online execution path
    if (navigator.onLine) {
      try {
        setAnalysisStage(t("recognition.stage_preprocess"));
        setProgressPercent(50);

        const blob = fileObj || (await (await fetch(dataUrl)).blob());
        const formData = new FormData();
        formData.append("file", blob, "captured_leaf.jpg");
        if (selectedCrop) formData.append("selected_crop", selectedCrop);
        formData.append("language", localStorage.getItem("agrishield_lang") || "en");

        setAnalysisStage(t("recognition.stage_inference"));
        setProgressPercent(75);

        const result = await submitPrediction(formData);

        setAnalysisStage(t("recognition.stage_explain"));
        setProgressPercent(100);

        // Cache result in Dexie
        await db.scans.put({
          id: result.scan_id,
          imageData: dataUrl,
          originalFilename: "captured_leaf.jpg",
          crop: result.primary_crop || selectedCrop || "Tomato",
          disease: result.primary_disease || result.primary_class || "Disease",
          confidence: result.calibrated_confidence,
          reliability: result.reliability_score,
          diagnosticState: result.state,
          isOfflinePending: false,
          createdAt: new Date().toISOString(),
          gradcamUrl: result.gradcam_url,
        });

        // Redirect to Result Page
        navigate(`/result?scan_id=${result.scan_id}`);
        return;
      } catch (err: any) {
        console.warn("Online API failed, falling back to local on-device Web Worker:", err);
      }
    }

    // Offline on-device inference via Web Worker
    setAnalysisStage("Running on-device edge neural model...");
    setProgressPercent(60);

    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        workerRef.current?.postMessage({
          type: "RUN_INFERENCE",
          payload: {
            rgbaData: imgData.data.buffer,
            width: img.width,
            height: img.height,
            selectedCrop: selectedCrop,
          },
        }, [imgData.data.buffer]);
      }
    };
  };

  return (
    <div className="min-h-screen bg-[#DDE4DB] text-agri-text max-w-md mx-auto relative font-sans flex flex-col justify-between overflow-hidden">
      {/* Hidden file input and canvas */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header */}
      <div className="flex items-center justify-between p-4 z-20">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-white/40 flex items-center justify-center text-agri-text hover:bg-white shadow-xs transition active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-bold text-agri-text">
          {t("recognition.title")}
        </h2>
        <div className="w-10" />
      </div>

      {/* Camera / Viewfinder Area */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-2">
        {/* Background sample leaf image matching reference screenshot if camera inactive */}
        <div className="relative w-full h-[68vh] rounded-4xl overflow-hidden bg-stone-900 border-2 border-white/60 shadow-xl flex items-center justify-center">
          {cameraActive ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src="https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=800&auto=format&fit=crop&q=80"
              alt="Leaf in viewfinder"
              className="w-full h-full object-cover"
            />
          )}

          {/* Viewfinder Corner Brackets Overlay */}
          <div className="absolute inset-8 pointer-events-none flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-2xl shadow-sm" />
              <div className="w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-2xl shadow-sm" />
            </div>
            <div className="flex justify-between">
              <div className="w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-2xl shadow-sm" />
              <div className="w-12 h-12 border-b-4 border-r-4 border-white rounded-br-2xl shadow-sm" />
            </div>
          </div>

          {/* Floating Progress Pill (Matching Screenshot: "60% Analyse") */}
          {analyzing && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30 animate-in fade-in zoom-in-95">
              <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-2xl border border-white/80 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-agri-primary animate-spin" />
                <span className="text-xs font-bold text-agri-text">
                  {progressPercent}% {t("recognition.analyzing")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quality Warning Toast */}
        {qualityWarning && (
          <div className="mt-3 w-full bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-2xl flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Quality Check Notice</span>
              <span>{qualityWarning}</span>
            </div>
            <button onClick={() => setQualityWarning(null)}>
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* Pre-Capture Controls and Guidance */}
      <div className="p-4 space-y-3 z-20">
        {/* Crop Selection Bar */}
        <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-white/50 flex items-center justify-between text-xs">
          <span className="font-medium text-agri-muted ml-2">Crop:</span>
          <div className="flex gap-1">
            {["", "Tomato", "Potato", "Corn"].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCrop(c)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition ${
                  selectedCrop === c
                    ? "bg-agri-primary text-white font-bold"
                    : "text-agri-text hover:bg-white"
                }`}
              >
                {c || "Auto"}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons: Camera / Upload / Cancel */}
        <div className="flex gap-3">
          {cameraActive ? (
            <button
              onClick={handleCapture}
              disabled={analyzing}
              className="flex-1 py-3.5 bg-agri-primary text-white font-bold text-sm rounded-2xl shadow-lg hover:bg-agri-primaryHover transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>Capture Leaf</span>
            </button>
          ) : (
            <>
              <button
                onClick={startCamera}
                disabled={analyzing}
                className="flex-1 py-3.5 bg-agri-primary text-white font-bold text-sm rounded-2xl shadow-lg hover:bg-agri-primaryHover transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                <span>Start Camera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="w-14 py-3.5 bg-white border border-agri-border text-agri-text font-bold rounded-2xl shadow-sm hover:bg-agri-surface transition active:scale-95 flex items-center justify-center"
                title="Gallery Upload"
              >
                <ImageIcon className="w-5 h-5 text-agri-primary" />
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => navigate(-1)}
          className="w-full py-3 rounded-2xl border border-agri-text/30 text-agri-text font-semibold text-xs text-center hover:bg-white/40 transition active:scale-95"
        >
          {t("recognition.cancel")}
        </button>
      </div>
    </div>
  );
};
