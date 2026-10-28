import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  X,
  ScanLine,
  RotateCcw,
  CheckCircle2,
  Leaf,
  Layers,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { submitPrediction } from "../services/api";
import { db } from "../db/indexedDb";

interface SampleLeaf {
  id: string;
  name: string;
  crop: string;
  symptomTag: string;
  url: string;
}

const SAMPLE_LEAVES: SampleLeaf[] = [
  {
    id: "sample-tomato-eb",
    name: "Early Blight",
    crop: "Tomato",
    symptomTag: "Target Spots",
    url: "/samples/tomato_early_blight.jpg",
  },
  {
    id: "sample-potato-lb",
    name: "Late Blight",
    crop: "Potato",
    symptomTag: "Water-soaked",
    url: "/samples/potato_late_blight.jpg",
  },
  {
    id: "sample-corn-rust",
    name: "Common Rust",
    crop: "Corn",
    symptomTag: "Pustules",
    url: "/samples/corn_common_rust.jpg",
  },
  {
    id: "sample-tomato-healthy",
    name: "Healthy Leaf",
    crop: "Tomato",
    symptomTag: "Uniform Green",
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

  // Initialize Web Worker for edge inference fallback
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
            setQualityWarning(outcome.message || "Image rejected due to optical blur or poor lighting.");
            return;
          }

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
      console.warn("Edge worker init warning:", err);
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
        setCapturedImage(null);
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable, opening file picker:", err);
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
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
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
      console.error("Failed to load sample leaf:", e);
    }
  };

  const processCapturedImage = async (dataUrl: string, fileObj?: Blob | File) => {
    setAnalyzing(true);
    setQualityWarning(null);

    // Stage 1: Optical Quality
    setAnalysisStage(t("recognition.stage_quality", "Checking optical focus & illumination..."));
    setProgressPercent(25);
    await new Promise((r) => setTimeout(r, 200));

    // Online execution path
    if (navigator.onLine) {
      try {
        setAnalysisStage(t("recognition.stage_preprocess", "Segmenting foliar discoloration (Chlorosis/Necrosis)..."));
        setProgressPercent(50);

        const blob = fileObj || (await (await fetch(dataUrl)).blob());
        const formData = new FormData();
        formData.append("file", blob, "captured_leaf.jpg");
        if (selectedCrop) formData.append("selected_crop", selectedCrop);
        formData.append("language", localStorage.getItem("agrishield_lang") || "en");

        setAnalysisStage(t("recognition.stage_inference", "Neural pathology classification..."));
        setProgressPercent(75);

        const result = await submitPrediction(formData);

        setAnalysisStage(t("recognition.stage_explain", "Generating ICAR clinical diagnostic report..."));
        setProgressPercent(100);

        // Store full enriched diagnosis in Dexie
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
          advisory: result.advisory,
          scientificName: result.scientific_name,
          topAlternatives: result.top_alternatives,
          quality: result.quality,
          actionGuidance: result.action_guidance,
          message: result.message,
        } as any);

        navigate(`/result?scan_id=${result.scan_id}`);
        return;
      } catch (err: any) {
        console.warn("Online API failed, falling back to local edge inference:", err);
      }
    }

    // Offline on-device inference via Web Worker
    setAnalysisStage("Running on-device neural model...");
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

  const resetScanner = () => {
    stopCamera();
    setCapturedImage(null);
    setQualityWarning(null);
    setAnalyzing(false);
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
      <header className="flex items-center justify-between p-4 bg-transparent z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-agri-border flex items-center justify-center text-agri-text hover:bg-white shadow-xs transition active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-agri-text">Crop Leaf Scanner</h2>
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI Foliar Pathology & Discoloration
          </span>
        </div>
        {capturedImage ? (
          <button
            onClick={resetScanner}
            className="w-10 h-10 rounded-full bg-white/90 border border-agri-border flex items-center justify-center text-stone-600 hover:text-agri-text shadow-xs transition active:scale-95"
            title="Reset Scanner"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {/* Center Viewfinder / Leaf Scanner Box */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-1">
        <div
          onClick={() => {
            if (!cameraActive && !capturedImage && !analyzing) {
              startCamera();
            }
          }}
          className={`relative w-full h-[58vh] rounded-4xl overflow-hidden bg-stone-900 border-2 ${
            analyzing ? "border-emerald-500 ring-4 ring-emerald-500/20" : "border-white/70"
          } shadow-2xl flex items-center justify-center cursor-pointer select-none`}
        >
          {cameraActive ? (
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Uploaded crop leaf"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Clean, Focused Leaf Alignment Target Viewfinder (NO decorative sunflower) */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-stone-900 via-stone-850 to-stone-900">
              <div className="relative w-24 h-24 mb-4 rounded-3xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center shadow-inner">
                <Leaf className="w-12 h-12 text-emerald-400 opacity-90 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-stone-900" />
              </div>
              <h3 className="text-white text-base font-bold tracking-tight">
                Scan Diseased or Discolored Leaf
              </h3>
              <p className="text-stone-300 text-xs mt-1.5 max-w-[240px] leading-relaxed">
                Center a single leaf showing spotting, yellowing (chlorosis), or blight inside the target reticle
              </p>
              <div className="mt-4 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-medium text-emerald-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tap to Open Camera or Upload</span>
              </div>
            </div>
          )}

          {/* Animated Laser Scan Bar during inference */}
          {analyzing && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_#10B981] animate-bounce z-20" />
          )}

          {/* Professional Viewfinder Corner Brackets Overlay */}
          <div className="absolute inset-7 pointer-events-none flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-9 h-9 border-t-3 border-l-3 border-white/90 rounded-tl-xl shadow-xs" />
              <div className="w-9 h-9 border-t-3 border-r-3 border-white/90 rounded-tr-xl shadow-xs" />
            </div>

            {/* Center Crosshair Target */}
            <div className="flex justify-center items-center">
              <div className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/90 shadow-[0_0_8px_#34D399]" />
              </div>
            </div>

            <div className="flex justify-between">
              <div className="w-9 h-9 border-b-3 border-l-3 border-white/90 rounded-bl-xl shadow-xs" />
              <div className="w-9 h-9 border-b-3 border-r-3 border-white/90 rounded-br-xl shadow-xs" />
            </div>
          </div>

          {/* Progress Toast Pill */}
          {analyzing && (
            <div className="absolute bottom-5 left-0 right-0 flex justify-center z-30 animate-in fade-in zoom-in-95 px-4">
              <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-2xl border border-white/80 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                <span className="text-xs font-bold text-stone-800">
                  {progressPercent}% • {analysisStage}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Optical Quality Notice Toast */}
        {qualityWarning && (
          <div className="mt-3 w-full bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-2xl flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Optical Quality Notice</span>
              <span>{qualityWarning}</span>
            </div>
            <button onClick={() => setQualityWarning(null)}>
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* 1-Tap Realistic Test Leaves Tray */}
      <div className="px-4 py-2 space-y-1.5 z-20">
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <span className="font-semibold flex items-center gap-1.5 text-stone-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Instant Test Leaves:</span>
          </span>
          <span className="text-[10px] text-stone-400">1-Tap Pathology Demo</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {SAMPLE_LEAVES.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectSample(s)}
              disabled={analyzing}
              className="bg-white p-1.5 rounded-2xl border border-agri-border shadow-xs hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 transition flex flex-col items-center text-center active:scale-95 group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 mb-1 border border-stone-200 relative">
                <img
                  src={s.url}
                  alt={s.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              </div>
              <span className="text-[10px] font-bold text-stone-800 leading-tight truncate w-full">
                {s.name}
              </span>
              <span className="text-[9px] text-emerald-700 font-medium truncate w-full">
                {s.symptomTag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Pre-Capture Controls and Crop Selector */}
      <div className="p-4 pt-1 space-y-2.5 z-20">
        {/* Crop Selection Filter */}
        <div className="bg-white p-1.5 rounded-2xl border border-agri-border shadow-xs flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-600 ml-2">Crop Filter:</span>
          <div className="flex gap-1">
            {["", "Tomato", "Potato", "Corn"].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCrop(c)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                  selectedCrop === c
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {c || "Auto-Detect"}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex gap-2.5">
          {cameraActive ? (
            <>
              <button
                onClick={handleCapture}
                disabled={analyzing}
                className="flex-1 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                <span>Capture Leaf Photo</span>
              </button>
              <button
                onClick={stopCamera}
                disabled={analyzing}
                className="w-14 py-3.5 bg-white border border-agri-border text-stone-600 font-bold rounded-2xl shadow-xs hover:bg-stone-50 transition active:scale-95 flex items-center justify-center"
                title="Cancel Camera"
              >
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startCamera}
                disabled={analyzing}
                className="flex-1 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                <span>Open Camera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="w-14 py-3.5 bg-white border border-agri-border text-agri-text font-bold rounded-2xl shadow-xs hover:bg-stone-50 transition active:scale-95 flex items-center justify-center"
                title="Upload Photo from Device"
              >
                <Upload className="w-5 h-5 text-emerald-700" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
