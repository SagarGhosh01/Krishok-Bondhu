import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Camera,
  Image as ImageIcon,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  X,
  Upload,
  RefreshCw,
  Info,
  Layers,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { submitPrediction } from "../services/api";
import { db } from "../db/indexedDb";

interface SampleLeaf {
  id: string;
  name: string;
  crop: string;
  url: string;
}

const SAMPLE_LEAVES: SampleLeaf[] = [
  {
    id: "sample-tomato-eb",
    name: "Early Blight",
    crop: "Tomato",
    url: "/samples/tomato_early_blight.jpg",
  },
  {
    id: "sample-potato-lb",
    name: "Late Blight",
    crop: "Potato",
    url: "/samples/potato_late_blight.jpg",
  },
  {
    id: "sample-corn-rust",
    name: "Common Rust",
    crop: "Corn",
    url: "/samples/corn_common_rust.jpg",
  },
  {
    id: "sample-tomato-healthy",
    name: "Healthy Leaf",
    crop: "Tomato",
    url: "/samples/tomato_healthy.jpg",
  },
];

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
            setQualityWarning(outcome.message || "Image rejected due to blur or lighting.");
            return;
          }

          // Save scan locally to Dexie
          const localId = "offline_" + Date.now();
          await db.scans.put({
            id: localId,
            imageData: capturedImage || "",
            originalFilename: "offline_capture.jpg",
            crop: outcome.primary_crop || selectedCrop || "Tomato",
            disease: outcome.primary_disease || outcome.primary_class || "Disease",
            confidence: outcome.calibrated_confidence,
            reliability: outcome.reliability_score,
            diagnosticState: outcome.state,
            isOfflinePending: true,
            createdAt: new Date().toISOString(),
          });

          // Queue for backend sync
          await db.pendingSync.put({
            clientUuid: localId,
            imageBase64: capturedImage || "",
            originalFilename: "offline_capture.jpg",
            selectedCrop: selectedCrop,
            clientPredictedClass: outcome.primary_class,
            clientConfidence: outcome.calibrated_confidence,
            createdAt: new Date().toISOString(),
            retryCount: 0,
          });

          navigate(`/result?scan_id=${localId}`);
        }
      };
    } catch (err) {
      console.warn("Failed to load edge worker:", err);
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
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.warn("Camera unavailable, falling back to file picker:", err);
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

  const handleSelectSample = async (sample: SampleLeaf) => {
    try {
      setSelectedCrop(sample.crop);
      const res = await fetch(sample.url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        processCapturedImage(dataUrl, blob as File);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error("Failed to load sample:", e);
    }
  };

  const processCapturedImage = async (dataUrl: string, fileObj?: Blob | File) => {
    setAnalyzing(true);
    setQualityWarning(null);

    // Stage 1: Quality Check
    setAnalysisStage(t("recognition.stage_quality", "Checking optical focus & exposure..."));
    setProgressPercent(25);
    await new Promise((r) => setTimeout(r, 200));

    // Online execution path
    if (navigator.onLine) {
      try {
        setAnalysisStage(t("recognition.stage_preprocess", "Preprocessing foliar dimensions..."));
        setProgressPercent(50);

        const blob = fileObj || (await (await fetch(dataUrl)).blob());
        const formData = new FormData();
        formData.append("file", blob, "captured_leaf.jpg");
        if (selectedCrop) formData.append("selected_crop", selectedCrop);
        formData.append("language", localStorage.getItem("agrishield_lang") || "en");

        setAnalysisStage(t("recognition.stage_inference", "Running neural disease classification..."));
        setProgressPercent(75);

        const result = await submitPrediction(formData);

        setAnalysisStage(t("recognition.stage_explain", "Synthesizing Grad-CAM & severity..."));
        setProgressPercent(100);

        // Save to Dexie
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
          severity: result.severity,
        } as any);

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
        workerRef.current?.postMessage(
          {
            type: "RUN_INFERENCE",
            payload: {
              rgbaData: imgData.data.buffer,
              width: img.width,
              height: img.height,
              selectedCrop: selectedCrop,
            },
          },
          [imgData.data.buffer]
        );
      }
    };
  };

  return (
    <div className="min-h-screen bg-agri-bg text-agri-text max-w-md mx-auto relative font-sans flex flex-col justify-between pb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top App Bar */}
      <div className="flex items-center justify-between p-4 bg-transparent z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-white/40 flex items-center justify-center text-agri-text hover:bg-white shadow-xs transition active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-bold text-agri-text">{t("recognition.title", "Recognition")}</h2>
        <div className="w-10" />
      </div>

      {/* Camera / Viewfinder Area */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-1">
        <div className="relative w-full h-[62vh] rounded-4xl overflow-hidden bg-stone-900 border-2 border-white/60 shadow-xl flex items-center justify-center">
          {cameraActive ? (
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          ) : (
            <img
              src={
                capturedImage ||
                "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=800&auto=format&fit=crop&q=80"
              }
              alt="Leaf in viewfinder"
              className="w-full h-full object-cover"
            />
          )}

          {/* Animated Laser Scan Line when analyzing */}
          {analyzing && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10B981] animate-bounce z-20" />
          )}

          {/* Viewfinder Corner Brackets Overlay */}
          <div className="absolute inset-8 pointer-events-none flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-10 h-10 border-t-3 border-l-3 border-white rounded-tl-xl shadow-xs" />
              <div className="w-10 h-10 border-t-3 border-r-3 border-white rounded-tr-xl shadow-xs" />
            </div>
            <div className="flex justify-center items-center">
              <div className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/80" />
              </div>
            </div>
            <div className="flex justify-between">
              <div className="w-10 h-10 border-b-3 border-l-3 border-white rounded-bl-xl shadow-xs" />
              <div className="w-10 h-10 border-b-3 border-r-3 border-white rounded-br-xl shadow-xs" />
            </div>
          </div>

          {/* Floating Progress Pill */}
          {analyzing && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30 animate-in fade-in zoom-in-95 px-4">
              <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-2xl border border-white/80 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-agri-primary animate-spin" />
                <span className="text-xs font-bold text-agri-text">
                  {progressPercent}% • {analysisStage}
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
              <span className="font-bold block">Quality Notice</span>
              <span>{qualityWarning}</span>
            </div>
            <button onClick={() => setQualityWarning(null)}>
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* 1-Tap Quick Sample Test Tray */}
      <div className="px-4 py-2 space-y-2 z-20">
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <span className="font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-agri-primary" />
            <span>Instant Test Leaves:</span>
          </span>
          <span className="text-[10px] text-stone-400">1-Tap Demo Diagnosis</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {SAMPLE_LEAVES.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectSample(s)}
              disabled={analyzing}
              className="bg-white p-1.5 rounded-2xl border border-agri-border shadow-xs hover:border-agri-primary transition flex flex-col items-center text-center active:scale-95 group"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 mb-1 border border-stone-200">
                <img src={s.url} alt={s.name} className="w-full h-full object-cover group-hover:scale-110 transition" />
              </div>
              <span className="text-[10px] font-bold text-agri-text leading-tight truncate w-full">
                {s.name}
              </span>
              <span className="text-[9px] text-stone-400">{s.crop}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pre-Capture Controls and Guidance */}
      <div className="p-4 pt-1 space-y-3 z-20">
        {/* Crop Selection Bar */}
        <div className="bg-white p-2 rounded-2xl border border-agri-border shadow-xs flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-600 ml-2">Crop Filter:</span>
          <div className="flex gap-1">
            {["", "Tomato", "Potato", "Corn"].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCrop(c)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                  selectedCrop === c
                    ? "bg-agri-primary text-white shadow-xs"
                    : "text-agri-text hover:bg-stone-100"
                }`}
              >
                {c || "Auto-Detect"}
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
              <span>Capture Photo</span>
            </button>
          ) : (
            <>
              <button
                onClick={startCamera}
                disabled={analyzing}
                className="flex-1 py-3.5 bg-agri-primary text-white font-bold text-sm rounded-2xl shadow-lg hover:bg-agri-primaryHover transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                <span>Open Camera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="w-14 py-3.5 bg-white border border-agri-border text-agri-text font-bold rounded-2xl shadow-xs hover:bg-stone-50 transition active:scale-95 flex items-center justify-center"
                title="Upload from Device"
              >
                <Upload className="w-5 h-5 text-agri-primary" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
