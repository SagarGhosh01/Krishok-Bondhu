/**
 * AgriShield AI - On-Device Edge Inference Web Worker
 * Runs INT8 ONNX Runtime Web model inside a non-blocking background thread.
 * Performs client-side image sharpness checks, ImageNet normalization, and calibrated diagnosis.
 */

import * as ort from "onnxruntime-web";

let session: ort.InferenceSession | null = null;
let metadata: any = null;

const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

// Initialize ONNX Session and metadata
async function initSession() {
  if (session && metadata) return true;
  try {
    const metaRes = await fetch("/model/metadata.json");
    if (metaRes.ok) {
      metadata = await metaRes.json();
    }

    // Configure ONNX Runtime Web WASM options
    ort.env.wasm.numThreads = 2;
    ort.env.wasm.simd = true;

    session = await ort.InferenceSession.create("/model/model.onnx", {
      executionProviders: ["wasm"],
    });

    console.log("[WebWorker] On-device ONNX model initialized successfully.");
    return true;
  } catch (err) {
    console.error("[WebWorker] Failed to load on-device model:", err);
    return false;
  }
}

// Client-side discrete Laplacian sharpness check
function computeLaplacianVariance(grayscale: Float32Array, width: number, height: number): number {
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = y * width + x;
      const lap =
        grayscale[idx - width] +
        grayscale[idx + width] +
        grayscale[idx - 1] +
        grayscale[idx + 1] -
        4 * grayscale[idx];

      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return variance;
}

// Message handler
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "INIT") {
    const ok = await initSession();
    self.postMessage({ type: "INIT_DONE", success: ok });
    return;
  }

  if (type === "RUN_INFERENCE") {
    try {
      await initSession();
      if (!session || !metadata) {
        throw new Error("Local model is not initialized.");
      }

      const { rgbaData, width, height, selectedCrop } = payload;
      const pixels = new Uint8ClampedArray(rgbaData);

      // 1. Sharpness & Exposure Check
      const gray = new Float32Array(width * height);
      let totalLuminance = 0;
      for (let i = 0; i < width * height; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        gray[i] = lum;
        totalLuminance += lum;
      }

      const avgLuminance = totalLuminance / (width * height);
      const blurScore = computeLaplacianVariance(gray, width, height);

      const minBlur = metadata.reliability_thresholds?.min_blur_score ?? 60.0;
      if (blurScore < minBlur) {
        self.postMessage({
          type: "INFERENCE_RESULT",
          success: true,
          outcome: {
            state: "CANNOT_ASSESS",
            defect: "BLURRY",
            blurScore,
            luminance: avgLuminance,
            message: "Image is out of focus. Please retake following pre-capture guidance.",
          },
        });
        return;
      }

      // 2. Preprocess to 224x224 planar float32 tensor
      const targetSize = 224;
      const floatArr = new Float32Array(1 * 3 * targetSize * targetSize);
      const xRatio = width / targetSize;
      const yRatio = height / targetSize;

      for (let y = 0; y < targetSize; y++) {
        const srcY = Math.floor(y * yRatio);
        for (let x = 0; x < targetSize; x++) {
          const srcX = Math.floor(x * xRatio);
          const srcIdx = (srcY * width + srcX) * 4;

          const r = pixels[srcIdx] / 255.0;
          const g = pixels[srcIdx + 1] / 255.0;
          const b = pixels[srcIdx + 2] / 255.0;

          const normR = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
          const normG = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
          const normB = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];

          const pixelOffset = y * targetSize + x;
          floatArr[0 * targetSize * targetSize + pixelOffset] = normR;
          floatArr[1 * targetSize * targetSize + pixelOffset] = normG;
          floatArr[2 * targetSize * targetSize + pixelOffset] = normB;
        }
      }

      const tensor = new ort.Tensor("float32", floatArr, [1, 3, targetSize, targetSize]);

      // 3. Inference
      const results = await session.run({ input: tensor });
      const logits = results.logits.data as Float32Array;

      // 4. Calibrated Probabilities with Temperature
      const temp = metadata.calibration?.temperature ?? 1.0;
      const scaledLogits = Array.from(logits).map((z) => z / temp);
      const maxLogit = Math.max(...scaledLogits);
      const expLogits = scaledLogits.map((z) => Math.exp(z - maxLogit));
      const sumExp = expLogits.reduce((a, b) => a + b, 0);
      const probs = expLogits.map((e) => e / sumExp);

      // Ranked candidates
      const classes: string[] = metadata.classes;
      const indexed = probs.map((prob, idx) => ({ idx, class_name: classes[idx], prob }));
      indexed.sort((a, b) => b.prob - a.prob);

      const top1 = indexed[0];
      const confThreshold = metadata.reliability_thresholds?.confident_threshold ?? 0.65;
      const uncFloor = metadata.reliability_thresholds?.uncertainty_floor ?? 0.25;

      let state = "CANNOT_ASSESS";
      if (top1.prob >= confThreshold) {
        state = "CONFIDENT";
      } else if (top1.prob >= uncFloor) {
        state = "UNCERTAIN";
      }

      // Check crop mismatch if specified
      if (selectedCrop && !top1.class_name.toLowerCase().includes(selectedCrop.toLowerCase())) {
        state = "UNCERTAIN";
      }

      const reliability = Math.min(0.99, Math.max(0.1, top1.prob * 0.7 + Math.min(1.0, blurScore / 300) * 0.3));

      self.postMessage({
        type: "INFERENCE_RESULT",
        success: true,
        outcome: {
          state,
          primaryClass: top1.class_name,
          confidence: top1.prob,
          reliability,
          blurScore,
          luminance: avgLuminance,
          topAlternatives: indexed.slice(0, 3),
          isOffline: true,
        },
      });
    } catch (err: any) {
      self.postMessage({
        type: "INFERENCE_RESULT",
        success: false,
        error: err.message || "Unknown worker error",
      });
    }
  }
};
