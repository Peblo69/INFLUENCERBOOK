import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ModelsSidebar } from "@/sections/ModelsPage/components/ModelsSidebar";
import { supabase } from "@/lib/supabase";
import {
  kiaraVisionImageToVideo,
  kiaraVisionTaskStatus,
  kiaraVisionCancelTask,
  kiaraRunninghubCreate,
  kiaraRunninghubStatus,
  kiaraRunninghubOutputs,
  kiaraFalSubmit,
  kiaraFalStatus,
  kiaraFalResult,
} from "@/services/kiaraGateway";
import {
  Grid3X3,
  List,
  Upload,
  Play,
  Clock,
  Maximize2,
  ChevronDown,
  Sparkles,
  X,
  Film,
  Image as ImageIcon,
  Zap,
  Hash,
  Loader2,
  AlertCircle,
  Download,
  Pause,
  Video,
  Gauge,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "grid" | "list";
type Duration = "5s" | "10s";
type AspectRatio = "16:9" | "9:16" | "4:3" | "3:4" | "1:1" | "21:9";
type AnimateXRatio = "9:16" | "16:9" | "1:1" | "4:3" | "3:4";
type GrokVideoRatio = "auto" | "16:9" | "4:3" | "3:2" | "1:1" | "2:3" | "3:4" | "9:16";
type GrokTextToVideoRatio = "16:9" | "4:3" | "3:2" | "1:1" | "2:3" | "3:4" | "9:16";
type GrokEditVideoResolution = "auto" | "480p" | "720p";

interface ModelOption {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface GeneratedVideo {
  id: string;
  url: string;
  thumbnail?: string;
  prompt: string;
  model: string;
  duration: string;
  aspectRatio: string;
  seed?: number;
  createdAt: string;
  status: "completed" | "generating" | "failed";
  error?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const RATIO_MAP: Record<AspectRatio, string> = {
  "16:9": "1280:720",
  "9:16": "720:1280",
  "4:3": "1104:832",
  "3:4": "832:1104",
  "1:1": "960:960",
  "21:9": "1584:672",
};

const ANIMATE_X_RATIO_MAP: Record<AnimateXRatio, { width: number; height: number }> = {
  "9:16": { width: 720, height: 1280 },
  "16:9": { width: 1280, height: 720 },
  "1:1": { width: 832, height: 832 },
  "4:3": { width: 960, height: 720 },
  "3:4": { width: 720, height: 960 },
};

const ASPECT_RATIOS: AspectRatio[] = ["16:9", "9:16", "4:3", "3:4", "1:1", "21:9"];
const ANIMATE_X_RATIOS: AnimateXRatio[] = ["9:16", "16:9", "1:1", "4:3", "3:4"];
const GROK_VIDEO_RATIOS: GrokVideoRatio[] = ["auto", "16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16"];
const GROK_TEXT_TO_VIDEO_RATIOS: GrokTextToVideoRatio[] = ["16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16"];
const GROK_VIDEO_RESOLUTIONS = ["480p", "720p"] as const;
const GROK_EDIT_VIDEO_RESOLUTIONS: GrokEditVideoResolution[] = ["auto", "480p", "720p"];
const DURATIONS: Duration[] = ["5s", "10s"];

const MODELS: ModelOption[] = [
  { id: "kiara-swift-1", name: "Kiara Swift 1", description: "Gen4 Turbo \u2022 Image to Video", enabled: true },
  { id: "kiara-animate-x", name: "Kiara Animate X", description: "Wan 2.2 \u2022 Image+Video Animation", enabled: true },
  { id: "kiara-grok-video", name: "Kiara Grok Video", description: "xAI Grok \u2022 Image to Video", enabled: true },
  { id: "kiara-grok-text-to-video", name: "Kiara Grok Text to Video", description: "xAI Grok \u2022 Text to Video with Audio", enabled: true },
  { id: "kiara-grok-edit-video", name: "Kiara Grok Edit Video", description: "xAI Grok \u2022 Video Editing", enabled: true },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAX_UPLOAD_BYTES = 9 * 1024 * 1024; // 9MB (bucket limit is 10MB, leave margin)
const MAX_VIDEO_UPLOAD_BYTES = 95 * 1024 * 1024; // 95MB (bucket limit is 100MB)
const MAX_DIMENSION = 2048; // Max px on longest side

/** Compress image via canvas to JPEG, ensuring it fits within size limits */
const compressImage = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    // If already small enough and JPEG, skip compression
    if (file.size <= MAX_UPLOAD_BYTES && file.type === "image/jpeg") {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down if too large
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });

/** Save a completed video to ai_generation_jobs + ai_generation_outputs */
const saveVideoToDatabase = async (
  userId: string,
  promptText: string,
  storagePath: string,
  taskId: string,
  params: Record<string, unknown>,
  modelId: string = "kiara-swift-1",
): Promise<string | null> => {
  try {
    const grokFalModels: Record<string, string> = {
      "kiara-grok-video": "xai/grok-imagine-video/image-to-video",
      "kiara-grok-text-to-video": "xai/grok-imagine-video/text-to-video",
      "kiara-grok-edit-video": "xai/grok-imagine-video/edit-video",
    };
    const providerInfo = modelId === "kiara-animate-x"
      ? { provider: "runninghub", workflow: "2017257989295575042" }
      : grokFalModels[modelId]
      ? { provider: "fal", fal_model: grokFalModels[modelId] }
      : { provider: "runway", runway_model: "gen4_turbo" };

    // 1. Create the job
    const { data: job, error: jobErr } = await supabase
      .from("ai_generation_jobs")
      .insert({
        user_id: userId,
        model_id: modelId,
        prompt: promptText,
        status: "completed",
        params: { ...params, ...providerInfo },
        fal_request_id: taskId,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      console.error("[VideosPage] Failed to save job:", jobErr);
      return null;
    }

    // 2. Create the output
    const { data: output, error: outErr } = await supabase
      .from("ai_generation_outputs")
      .insert({
        job_id: job.id,
        image_url: storagePath,
        meta: { type: "video", ...providerInfo, task_id: taskId },
      })
      .select("id")
      .single();

    if (outErr) {
      console.error("[VideosPage] Failed to save output:", outErr);
    }

    return output?.id || job.id;
  } catch (err) {
    console.error("[VideosPage] DB save error:", err);
    return null;
  }
};

/** Load saved videos from the database */
const loadSavedVideos = async (userId: string): Promise<GeneratedVideo[]> => {
  try {
    const { data, error } = await supabase
      .from("ai_generation_outputs")
      .select("id, image_url, created_at, meta, ai_generation_jobs ( prompt, model_id, params, created_at )")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data
      .filter((row: any) => {
        const url = row.image_url || "";
        return url.includes("runway-video/") || url.includes("animate-x/") || url.includes("grok-video/") || url.match(/\.(mp4|webm|mov)(\?|$)/);
      })
      .map((row: any) => {
        const url = row.image_url || "";
        const resolvedUrl = url.startsWith("http")
          ? url
          : supabase.storage.from("generated-images").getPublicUrl(url).data.publicUrl;
        const params = row.ai_generation_jobs?.params || {};
        const modelId = row.ai_generation_jobs?.model_id || "kiara-swift-1";

        // Reverse-lookup aspect ratio
        let ar = "16:9";
        if (params.aspect_ratio && typeof params.aspect_ratio === "string") {
          ar = params.aspect_ratio;
        } else if (params.ratio) {
          ar = Object.entries(RATIO_MAP).find(([, v]) => v === params.ratio)?.[0] || "16:9";
        } else if (params.width && params.height) {
          ar = Object.entries(ANIMATE_X_RATIO_MAP).find(
            ([, v]) => v.width === params.width && v.height === params.height
          )?.[0] || "16:9";
        }

        const dur = params.duration ? `${params.duration}s` : "5s";

        const modelNameMap: Record<string, string> = {
          "kiara-animate-x": "Kiara Animate X",
          "kiara-grok-video": "Kiara Grok Video",
          "kiara-grok-text-to-video": "Kiara Grok Text to Video",
          "kiara-grok-edit-video": "Kiara Grok Edit Video",
        };
        const modelName = modelNameMap[modelId] || "Kiara Swift 1";

        return {
          id: row.id,
          url: resolvedUrl,
          prompt: row.ai_generation_jobs?.prompt || "",
          model: modelName,
          duration: dur,
          aspectRatio: ar,
          seed: params.seed,
          createdAt: row.created_at
            ? new Date(row.created_at).toLocaleString()
            : "",
          status: "completed" as const,
        };
      });
  } catch (err) {
    console.error("[VideosPage] Failed to load videos:", err);
    return [];
  }
};

/** Upload image file to Supabase storage and return a signed URL */
const uploadImageToStorage = async (file: File, userId: string): Promise<string> => {
  const compressed = await compressImage(file);
  const path = `${userId}/video-input/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;

  const { error } = await supabase.storage
    .from("generated-images")
    .upload(path, compressed, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });

  if (error) throw new Error(`Failed to upload image: ${error.message}`);

  const { data: signed, error: signedErr } = await supabase.storage
    .from("generated-images")
    .createSignedUrl(path, 3600);

  if (signedErr || !signed?.signedUrl) throw new Error("Failed to create signed URL");
  return signed.signedUrl;
};

/** Upload video file to Supabase storage and return a signed URL */
const uploadVideoToStorage = async (file: File, userId: string): Promise<string> => {
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    throw new Error(`Video too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 95MB.`);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `${userId}/video-input/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const contentType = file.type || "video/mp4";

  const { error } = await supabase.storage
    .from("generated-images")
    .upload(path, file, { contentType, cacheControl: "3600", upsert: false });

  if (error) throw new Error(`Failed to upload video: ${error.message}`);

  const { data: signed, error: signedErr } = await supabase.storage
    .from("generated-images")
    .createSignedUrl(path, 3600);

  if (signedErr || !signed?.signedUrl) throw new Error("Failed to create signed URL");
  return signed.signedUrl;
};

// ── Component ────────────────────────────────────────────────────────────────

export const VideosPage = () => {
  const { user, profile } = useAuth();

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [prompt, setPrompt] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [duration, setDuration] = useState<Duration>("5s");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [seed, setSeed] = useState<string>("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [lightboxVideo, setLightboxVideo] = useState<GeneratedVideo | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Animate X specific state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [animateXDuration, setAnimateXDuration] = useState(10);
  const [animateXFps, setAnimateXFps] = useState(25);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const pollingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Grok Video specific state (shared across Grok models where applicable)
  const [grokDuration, setGrokDuration] = useState(6);
  const [grokAspectRatio, setGrokAspectRatio] = useState<GrokVideoRatio>("auto");
  const [grokResolution, setGrokResolution] = useState<typeof GROK_VIDEO_RESOLUTIONS[number]>("480p");
  const [grokTextToVideoRatio, setGrokTextToVideoRatio] = useState<GrokTextToVideoRatio>("16:9");
  const [grokEditResolution, setGrokEditResolution] = useState<GrokEditVideoResolution>("auto");

  // Edit Video specific — reuse videoFile/videoPreview state from Animate X section

  const isAnimateX = selectedModel.id === "kiara-animate-x";
  const isGrokVideo = selectedModel.id === "kiara-grok-video";
  const isGrokTextToVideo = selectedModel.id === "kiara-grok-text-to-video";
  const isGrokEditVideo = selectedModel.id === "kiara-grok-edit-video";
  const isAnyGrokVideo = isGrokVideo || isGrokTextToVideo || isGrokEditVideo;
  const needsImageInput = !isGrokTextToVideo && !isGrokEditVideo; // text-to-video & edit-video don't need image
  const needsVideoInput = isAnimateX || isGrokEditVideo;

  // Load saved videos on mount
  useEffect(() => {
    if (!user?.id) return;
    loadSavedVideos(user.id).then((videos) => {
      if (videos.length > 0) setGeneratedVideos(videos);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [uploadedPreview, videoPreview]);

  // ── Drag & Drop (Image) ────────────────────────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const next = prev - 1;
      if (next <= 0) setIsDragging(false);
      return next;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
      setUploadedFile(file);
      setUploadedPreview(URL.createObjectURL(file));
    }
  }, [uploadedPreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
      setUploadedFile(file);
      setUploadedPreview(URL.createObjectURL(file));
    }
  };

  const clearUpload = () => {
    if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
    setUploadedFile(null);
    setUploadedPreview(null);
  };

  // ── Video File Handlers (Animate X) ────────────────────────────────────

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const clearVideoUpload = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
  };

  // ── Generate (Swift 1) ─────────────────────────────────────────────────

  const handleGenerateSwift1 = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setTaskProgress("Preparing...");
    pollingRef.current = true;

    try {
      setTaskProgress("Uploading image...");
      const promptImage = await uploadImageToStorage(uploadedFile!, user?.id || "anon");
      const durationNum = duration === "10s" ? 10 : 5;
      const ratio = RATIO_MAP[aspectRatio];
      const seedNum = seed.trim() ? parseInt(seed, 10) : undefined;

      setTaskProgress("Submitting...");

      const result = await kiaraVisionImageToVideo({
        promptImage,
        promptText: prompt.trim() || undefined,
        duration: durationNum as 5 | 10,
        ratio,
        seed: seedNum,
      });

      if (!result.success || !result.task_id) {
        throw new Error(result.error || "Failed to start video generation");
      }

      setTaskId(result.task_id);
      setTaskProgress("Queued...");

      // Add a generating placeholder
      const placeholder: GeneratedVideo = {
        id: result.task_id,
        url: "",
        thumbnail: uploadedPreview || undefined,
        prompt: prompt || "Image to video",
        model: selectedModel.name,
        duration,
        aspectRatio,
        seed: seedNum,
        createdAt: new Date().toLocaleString(),
        status: "generating",
      };
      setGeneratedVideos((prev) => [placeholder, ...prev]);

      // Poll for completion
      let completed = false;
      const startTime = Date.now();
      const MAX_POLL_TIME = 600000; // 10 min

      while (!completed && pollingRef.current && Date.now() - startTime < MAX_POLL_TIME) {
        await new Promise((r) => setTimeout(r, 5000));
        if (!pollingRef.current) break;

        const status = await kiaraVisionTaskStatus(result.task_id);
        const s = (status.status || "").toUpperCase();

        if (s === "RUNNING") setTaskProgress("Generating video...");
        else if (s === "THROTTLED") setTaskProgress("In queue...");
        else if (s === "PENDING") setTaskProgress("Queued...");

        if (s === "SUCCEEDED") {
          completed = true;
          const videoUrl =
            status.video ||
            (Array.isArray(status.output) ? status.output[0] : (status.output as string));
          const storagePath = Array.isArray(status.storagePaths)
            ? status.storagePaths[0]
            : undefined;

          // Save to database so it persists and shows in Assets
          const dbId = await saveVideoToDatabase(
            user?.id || "",
            prompt.trim() || "Image to video",
            storagePath || videoUrl || "",
            result.task_id,
            { duration: durationNum, ratio, seed: seedNum },
            "kiara-swift-1"
          );

          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === result.task_id
                ? { ...v, id: dbId || v.id, url: videoUrl || "", status: "completed" as const }
                : v
            )
          );
        } else if (s === "FAILED") {
          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === result.task_id
                ? { ...v, status: "failed" as const, error: status.error || "Generation failed" }
                : v
            )
          );
          throw new Error(status.error || "Video generation failed");
        }
      }

      if (!completed && pollingRef.current) {
        throw new Error("Video generation timed out");
      }
    } catch (err: any) {
      setGenerationError(err.message || "Generation failed");
      console.error("[VideosPage] Error:", err);
    } finally {
      setIsGenerating(false);
      setTaskId(null);
      setTaskProgress("");
      pollingRef.current = false;
    }
  };

  // ── Generate (Animate X) ──────────────────────────────────────────────

  const handleGenerateAnimateX = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setTaskProgress("Preparing...");
    pollingRef.current = true;

    try {
      // 1. Upload image
      setTaskProgress("Uploading image...");
      const imageUrl = await uploadImageToStorage(uploadedFile!, user?.id || "anon");

      // 2. Upload video (optional)
      let videoUrl: string | undefined;
      if (videoFile) {
        setTaskProgress("Uploading video...");
        videoUrl = await uploadVideoToStorage(videoFile, user?.id || "anon");
      }

      // 3. Build node overrides
      const axRatio = (aspectRatio in ANIMATE_X_RATIO_MAP ? aspectRatio : "9:16") as AnimateXRatio;
      const dims = ANIMATE_X_RATIO_MAP[axRatio];
      const seedNum = seed.trim() ? parseInt(seed, 10) : undefined;

      const nodeInfoList: { nodeId: string; fieldName: string; fieldValue: string }[] = [
        { nodeId: "167", fieldName: "image", fieldValue: imageUrl },
        { nodeId: "264", fieldName: "value", fieldValue: String(dims.width) },
        { nodeId: "265", fieldName: "value", fieldValue: String(dims.height) },
        { nodeId: "255", fieldName: "value", fieldValue: String(animateXDuration) },
        { nodeId: "257", fieldName: "value", fieldValue: String(animateXFps) },
      ];

      if (videoUrl) {
        nodeInfoList.push({ nodeId: "52", fieldName: "video", fieldValue: videoUrl });
      }
      if (seedNum !== undefined) {
        nodeInfoList.push({ nodeId: "353", fieldName: "seed", fieldValue: String(seedNum) });
      }

      // 4. Create task
      setTaskProgress("Submitting to RunningHub...");
      const createResult = await kiaraRunninghubCreate({
        model_id: "kiara-animate-x",
        prompt: prompt.trim() || "animate this image",
        nodeInfoList,
      });

      if (!createResult.task_id) {
        throw new Error("Failed to create RunningHub task");
      }

      const rhTaskId = createResult.task_id;
      const jobId = createResult.job_id;
      setTaskId(rhTaskId);
      setTaskProgress("Queued...");

      // Add placeholder
      const placeholder: GeneratedVideo = {
        id: rhTaskId,
        url: "",
        thumbnail: uploadedPreview || undefined,
        prompt: prompt || "Image+video animation",
        model: "Kiara Animate X",
        duration: `${animateXDuration}s`,
        aspectRatio: axRatio,
        seed: seedNum,
        createdAt: new Date().toLocaleString(),
        status: "generating",
      };
      setGeneratedVideos((prev) => [placeholder, ...prev]);

      // 5. Poll for completion
      let completed = false;
      const startTime = Date.now();
      const MAX_POLL_TIME = 900000; // 15 min for video gen

      while (!completed && pollingRef.current && Date.now() - startTime < MAX_POLL_TIME) {
        await new Promise((r) => setTimeout(r, 5000));
        if (!pollingRef.current) break;

        const statusResult = await kiaraRunninghubStatus(rhTaskId);
        const s = (statusResult.status || "").toUpperCase();

        if (s === "RUNNING") setTaskProgress("Generating video...");
        else if (s === "QUEUED" || s === "PENDING") setTaskProgress("In queue...");
        else setTaskProgress(`Status: ${s.toLowerCase()}...`);

        if (s === "SUCCESS" || s === "SUCCEEDED") {
          completed = true;

          // 6. Get outputs
          setTaskProgress("Downloading result...");
          const outputResult = await kiaraRunninghubOutputs(rhTaskId, jobId);

          const outputUrl = outputResult.urls?.[0] || "";
          const storagePath = outputResult.storagePaths?.[0] || outputUrl;

          // 7. Save to database
          const dbId = await saveVideoToDatabase(
            user?.id || "",
            prompt.trim() || "Image+video animation",
            storagePath,
            rhTaskId,
            { width: dims.width, height: dims.height, duration: animateXDuration, fps: animateXFps, seed: seedNum },
            "kiara-animate-x"
          );

          // 8. Update UI
          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === rhTaskId
                ? { ...v, id: dbId || v.id, url: outputUrl, status: "completed" as const }
                : v
            )
          );
        } else if (s === "FAILED" || s === "ERROR") {
          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === rhTaskId
                ? { ...v, status: "failed" as const, error: "Generation failed" }
                : v
            )
          );
          throw new Error("Video generation failed on RunningHub");
        }
      }

      if (!completed && pollingRef.current) {
        throw new Error("Video generation timed out (15 min limit)");
      }
    } catch (err: any) {
      setGenerationError(err.message || "Generation failed");
      console.error("[VideosPage] AnimateX error:", err);
    } finally {
      setIsGenerating(false);
      setTaskId(null);
      setTaskProgress("");
      pollingRef.current = false;
    }
  };

  // ── Generate (Grok Video) ─────────────────────────────────────────────

  const handleGenerateGrokVideo = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setTaskProgress("Preparing...");
    pollingRef.current = true;

    try {
      // 1. Upload image
      setTaskProgress("Uploading image...");
      const imageUrl = await uploadImageToStorage(uploadedFile!, user?.id || "anon");

      const seedNum = seed.trim() ? parseInt(seed, 10) : undefined;

      // 2. Submit to fal.ai queue
      setTaskProgress("Submitting to Grok Video...");
      const submitResult = await kiaraFalSubmit({
        model_id: "kiara-grok-video",
        prompt: prompt.trim() || "animate this image into a video",
        image_url: imageUrl,
        duration: grokDuration,
        aspect_ratio: grokAspectRatio !== "auto" ? grokAspectRatio : undefined,
        resolution: grokResolution,
      });

      if (!submitResult.success || !submitResult.request_id) {
        throw new Error(submitResult.error || "Failed to submit to Grok Video");
      }

      const requestId = submitResult.request_id;
      const jobId = submitResult.job_id;
      const endpoint = submitResult.endpoint;
      setTaskId(requestId);
      setTaskProgress("In queue...");

      // Add placeholder
      const placeholder: GeneratedVideo = {
        id: requestId,
        url: "",
        thumbnail: uploadedPreview || undefined,
        prompt: prompt || "Image to video",
        model: "Kiara Grok Video",
        duration: `${grokDuration}s`,
        aspectRatio: grokAspectRatio,
        seed: seedNum,
        createdAt: new Date().toLocaleString(),
        status: "generating",
      };
      setGeneratedVideos((prev) => [placeholder, ...prev]);

      // 3. Poll for completion
      let completed = false;
      const startTime = Date.now();
      const MAX_POLL_TIME = 600000; // 10 min

      while (!completed && pollingRef.current && Date.now() - startTime < MAX_POLL_TIME) {
        await new Promise((r) => setTimeout(r, 5000));
        if (!pollingRef.current) break;

        const statusResult = await kiaraFalStatus(requestId, endpoint);
        const s = (statusResult.status || "").toUpperCase();

        if (s === "IN_QUEUE") {
          const pos = statusResult.queue_position;
          setTaskProgress(pos ? `In queue (position ${pos})...` : "In queue...");
        } else if (s === "IN_PROGRESS") {
          setTaskProgress("Generating video...");
        } else if (s === "COMPLETED") {
          completed = true;

          // 4. Fetch result
          setTaskProgress("Downloading result...");
          const resultData = await kiaraFalResult(requestId, jobId || undefined, endpoint);

          const outputUrl = resultData.urls?.[0] || "";
          const storagePath = resultData.storagePaths?.[0] || outputUrl;

          // 5. Save to database
          const dbId = await saveVideoToDatabase(
            user?.id || "",
            prompt.trim() || "Image to video",
            storagePath,
            requestId,
            { duration: grokDuration, aspect_ratio: grokAspectRatio, resolution: grokResolution, seed: seedNum },
            "kiara-grok-video"
          );

          // 6. Update UI
          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === requestId
                ? { ...v, id: dbId || v.id, url: outputUrl, status: "completed" as const }
                : v
            )
          );
        } else if (s === "FAILED") {
          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === requestId
                ? { ...v, status: "failed" as const, error: statusResult.error || "Generation failed" }
                : v
            )
          );
          throw new Error(statusResult.error || "Grok Video generation failed");
        }
      }

      if (!completed && pollingRef.current) {
        throw new Error("Video generation timed out (10 min limit)");
      }
    } catch (err: any) {
      setGenerationError(err.message || "Generation failed");
      console.error("[VideosPage] GrokVideo error:", err);
    } finally {
      setIsGenerating(false);
      setTaskId(null);
      setTaskProgress("");
      pollingRef.current = false;
    }
  };

  // ── Generate (Grok Text-to-Video) ─────────────────────────────────────

  const handleGenerateGrokTextToVideo = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setTaskProgress("Preparing...");
    pollingRef.current = true;

    try {
      if (!prompt.trim()) throw new Error("A prompt is required for text-to-video generation");

      setTaskProgress("Submitting to Grok Text-to-Video...");
      const submitResult = await kiaraFalSubmit({
        model_id: "kiara-grok-text-to-video",
        prompt: prompt.trim(),
        duration: grokDuration,
        aspect_ratio: grokTextToVideoRatio,
        resolution: grokResolution,
      });

      if (!submitResult.success || !submitResult.request_id) {
        throw new Error(submitResult.error || "Failed to submit to Grok Text-to-Video");
      }

      const requestId = submitResult.request_id;
      const jobId = submitResult.job_id;
      const endpoint = submitResult.endpoint;
      setTaskId(requestId);
      setTaskProgress("In queue...");

      const placeholder: GeneratedVideo = {
        id: requestId,
        url: "",
        prompt: prompt,
        model: "Kiara Grok Text to Video",
        duration: `${grokDuration}s`,
        aspectRatio: grokTextToVideoRatio,
        createdAt: new Date().toLocaleString(),
        status: "generating",
      };
      setGeneratedVideos((prev) => [placeholder, ...prev]);

      let completed = false;
      const startTime = Date.now();
      const MAX_POLL_TIME = 600000;

      while (!completed && pollingRef.current && Date.now() - startTime < MAX_POLL_TIME) {
        await new Promise((r) => setTimeout(r, 5000));
        if (!pollingRef.current) break;

        const statusResult = await kiaraFalStatus(requestId, endpoint);
        const s = (statusResult.status || "").toUpperCase();

        if (s === "IN_QUEUE") {
          const pos = statusResult.queue_position;
          setTaskProgress(pos ? `In queue (position ${pos})...` : "In queue...");
        } else if (s === "IN_PROGRESS") {
          setTaskProgress("Generating video...");
        } else if (s === "COMPLETED") {
          completed = true;
          setTaskProgress("Downloading result...");
          const resultData = await kiaraFalResult(requestId, jobId || undefined, endpoint);
          const outputUrl = resultData.urls?.[0] || "";
          const storagePath = resultData.storagePaths?.[0] || outputUrl;

          const dbId = await saveVideoToDatabase(
            user?.id || "", prompt.trim(), storagePath, requestId,
            { duration: grokDuration, aspect_ratio: grokTextToVideoRatio, resolution: grokResolution },
            "kiara-grok-text-to-video"
          );

          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === requestId
                ? { ...v, id: dbId || v.id, url: outputUrl, status: "completed" as const }
                : v
            )
          );
        } else if (s === "FAILED") {
          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === requestId
                ? { ...v, status: "failed" as const, error: statusResult.error || "Generation failed" }
                : v
            )
          );
          throw new Error(statusResult.error || "Text-to-video generation failed");
        }
      }

      if (!completed && pollingRef.current) throw new Error("Video generation timed out");
    } catch (err: any) {
      setGenerationError(err.message || "Generation failed");
      console.error("[VideosPage] GrokTextToVideo error:", err);
    } finally {
      setIsGenerating(false);
      setTaskId(null);
      setTaskProgress("");
      pollingRef.current = false;
    }
  };

  // ── Generate (Grok Edit Video) ──────────────────────────────────────

  const handleGenerateGrokEditVideo = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setTaskProgress("Preparing...");
    pollingRef.current = true;

    try {
      if (!videoFile) throw new Error("Please upload a video to edit");
      if (!prompt.trim()) throw new Error("A prompt describing the edit is required");

      setTaskProgress("Uploading video...");
      const videoSignedUrl = await uploadVideoToStorage(videoFile, user?.id || "anon");

      setTaskProgress("Submitting to Grok Edit Video...");
      const submitResult = await kiaraFalSubmit({
        model_id: "kiara-grok-edit-video",
        prompt: prompt.trim(),
        video_url: videoSignedUrl,
        resolution: grokEditResolution,
      });

      if (!submitResult.success || !submitResult.request_id) {
        throw new Error(submitResult.error || "Failed to submit to Grok Edit Video");
      }

      const requestId = submitResult.request_id;
      const jobId = submitResult.job_id;
      const endpoint = submitResult.endpoint;
      setTaskId(requestId);
      setTaskProgress("In queue...");

      const placeholder: GeneratedVideo = {
        id: requestId,
        url: "",
        prompt: prompt,
        model: "Kiara Grok Edit Video",
        duration: "~8s",
        aspectRatio: "auto",
        createdAt: new Date().toLocaleString(),
        status: "generating",
      };
      setGeneratedVideos((prev) => [placeholder, ...prev]);

      let completed = false;
      const startTime = Date.now();
      const MAX_POLL_TIME = 600000;

      while (!completed && pollingRef.current && Date.now() - startTime < MAX_POLL_TIME) {
        await new Promise((r) => setTimeout(r, 5000));
        if (!pollingRef.current) break;

        const statusResult = await kiaraFalStatus(requestId, endpoint);
        const s = (statusResult.status || "").toUpperCase();

        if (s === "IN_QUEUE") {
          const pos = statusResult.queue_position;
          setTaskProgress(pos ? `In queue (position ${pos})...` : "In queue...");
        } else if (s === "IN_PROGRESS") {
          setTaskProgress("Editing video...");
        } else if (s === "COMPLETED") {
          completed = true;
          setTaskProgress("Downloading result...");
          const resultData = await kiaraFalResult(requestId, jobId || undefined, endpoint);
          const outputUrl = resultData.urls?.[0] || "";
          const storagePath = resultData.storagePaths?.[0] || outputUrl;

          const dbId = await saveVideoToDatabase(
            user?.id || "", prompt.trim(), storagePath, requestId,
            { resolution: grokEditResolution },
            "kiara-grok-edit-video"
          );

          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === requestId
                ? { ...v, id: dbId || v.id, url: outputUrl, status: "completed" as const }
                : v
            )
          );
        } else if (s === "FAILED") {
          setGeneratedVideos((prev) =>
            prev.map((v) =>
              v.id === requestId
                ? { ...v, status: "failed" as const, error: statusResult.error || "Edit failed" }
                : v
            )
          );
          throw new Error(statusResult.error || "Video editing failed");
        }
      }

      if (!completed && pollingRef.current) throw new Error("Video editing timed out");
    } catch (err: any) {
      setGenerationError(err.message || "Edit failed");
      console.error("[VideosPage] GrokEditVideo error:", err);
    } finally {
      setIsGenerating(false);
      setTaskId(null);
      setTaskProgress("");
      pollingRef.current = false;
    }
  };

  // ── Generate (router) ─────────────────────────────────────────────────

  const handleGenerate = async () => {
    // Validate inputs based on model type
    if (needsImageInput && !uploadedFile) {
      setGenerationError("Please upload an input image");
      return;
    }
    if (isGrokEditVideo && !videoFile) {
      setGenerationError("Please upload a video to edit");
      return;
    }
    if (isGrokTextToVideo && !prompt.trim()) {
      setGenerationError("Please enter a text prompt");
      return;
    }
    if (!selectedModel.enabled) {
      setGenerationError("This model is not available yet");
      return;
    }

    if (isGrokTextToVideo) {
      await handleGenerateGrokTextToVideo();
    } else if (isGrokEditVideo) {
      await handleGenerateGrokEditVideo();
    } else if (isGrokVideo) {
      await handleGenerateGrokVideo();
    } else if (isAnimateX) {
      await handleGenerateAnimateX();
    } else {
      await handleGenerateSwift1();
    }
  };

  const handleCancel = async () => {
    pollingRef.current = false;
    if (taskId) {
      // Try to cancel on the appropriate backend (only Swift 1 supports cancel via Vision API)
      if (!isAnimateX && !isAnyGrokVideo) {
        try {
          await kiaraVisionCancelTask(taskId);
        } catch {}
      }
      // Mark as failed in the list
      setGeneratedVideos((prev) =>
        prev.map((v) =>
          v.id === taskId ? { ...v, status: "failed" as const, error: "Cancelled" } : v
        )
      );
    }
    setIsGenerating(false);
    setTaskId(null);
    setTaskProgress("");
  };

  // ── Derived values for settings ────────────────────────────────────────

  const ratioOptions = isGrokVideo ? GROK_VIDEO_RATIOS
    : isGrokTextToVideo ? GROK_TEXT_TO_VIDEO_RATIOS
    : isAnimateX ? ANIMATE_X_RATIOS
    : ASPECT_RATIOS;

  return (
    <div className="h-screen bg-[#050505] text-white font-sans overflow-hidden flex">
      <ModelsSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-14 bg-[#080808] border-b border-white/[0.03] flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-2.5 w-[200px]">
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Film size={15} className="text-white/60" />
            </div>
            <span className="text-[14px] font-medium text-white/80 tracking-tight">Kiara Video</span>
          </div>

          <div className="flex items-center gap-2.5 w-[200px] justify-end">
            {/* View Toggle */}
            <div className="flex items-center bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.04]">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "grid" ? "bg-white/[0.08] text-white/80" : "text-white/30 hover:text-white/50"
                }`}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "list" ? "bg-white/[0.08] text-white/80" : "text-white/30 hover:text-white/50"
                }`}
              >
                <List size={14} />
              </button>
            </div>

            {/* User Avatar */}
            <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
              <span className="text-[10px] font-medium text-white/60">
                {profile?.display_name?.[0] || user?.email?.[0] || "U"}
              </span>
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex min-h-0">
          {/* Left Control Panel */}
          <aside className="w-[400px] bg-[#0a0a0a] border-r border-white/[0.03] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 space-y-4">
                {/* Input Image (Required — hidden for text-to-video & edit-video) */}
                {needsImageInput && <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Input Image</h4>
                    <span className="text-[10px] text-amber-400/60">Required</span>
                  </div>

                  <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => !uploadedPreview && fileInputRef.current?.click()}
                    className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group ${
                      isDragging
                        ? "border-white/25 bg-white/[0.05] scale-[1.02]"
                        : uploadedPreview
                        ? "border-white/[0.08] bg-black"
                        : "border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03]"
                    }`}
                    style={{ aspectRatio: aspectRatio === "9:16" || aspectRatio === "3:4" ? "9/16" : aspectRatio === "1:1" ? "1/1" : "16/9" }}
                  >
                    {uploadedPreview ? (
                      <>
                        <img src={uploadedPreview} alt="Uploaded" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-2">
                            <ImageIcon size={18} className="text-white/70" />
                          </div>
                          <p className="text-[11px] text-white/50">Click to replace</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); clearUpload(); }}
                          className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-[10px] text-white/40">Reference image active</p>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                        <div className="relative mb-4">
                          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                            <Upload size={22} className={`text-white/30 transition-all duration-300 ${isDragging ? "scale-110 text-white/50" : ""}`} />
                          </div>
                          {isDragging && <div className="absolute inset-0 rounded-2xl border-2 border-white/20 animate-ping" />}
                        </div>
                        <p className="text-[13px] text-white/50 font-medium mb-1">
                          {isDragging ? "Drop image here" : "Drop image or click to upload"}
                        </p>
                        <p className="text-[11px] text-white/25 mb-4">Supports PNG, JPG up to 10MB</p>
                        <div className="flex items-center gap-2">
                          {["PNG", "JPG", "WEBP"].map((fmt) => (
                            <span key={fmt} className="px-2 py-1 text-[9px] text-white/30 bg-white/[0.03] rounded border border-white/[0.04]">{fmt}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </div>
                </div>}

                {/* Video Input (Animate X = optional reference, Edit Video = required) */}
                {needsVideoInput && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                        {isGrokEditVideo ? "Input Video" : "Video Reference"}
                      </h4>
                      <span className="text-[10px] text-white/20">
                        {isGrokEditVideo ? "Required" : "Optional"}
                      </span>
                    </div>

                    {videoFile ? (
                      <div className="relative rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                            <Video size={16} className="text-white/40" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-white/60 truncate">{videoFile.name}</p>
                            <p className="text-[10px] text-white/25">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                          </div>
                          <button
                            onClick={clearVideoUpload}
                            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-white/40 hover:text-white transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {videoPreview && (
                          <video
                            src={videoPreview}
                            className="w-full mt-3 rounded-lg max-h-32 object-cover"
                            muted
                            playsInline
                            loop
                            autoPlay
                          />
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => videoInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:border-white/[0.1]">
                          <Video size={15} className="text-white/25 group-hover:text-white/40" />
                        </div>
                        <div className="text-left">
                          <p className="text-[12px] text-white/40 group-hover:text-white/60">Upload video for face/pose tracking</p>
                          <p className="text-[10px] text-white/20">MP4, WebM up to 95MB</p>
                        </div>
                      </button>
                    )}
                    <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoFileSelect} className="hidden" />
                  </div>
                )}

                {/* Prompt Input */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Prompt</h4>
                    <span className="text-[10px] text-white/20">{prompt.length}/1000</span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                    placeholder="Describe the motion, scene, and style you want to generate..."
                    className="w-full h-32 bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 text-[13px] text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/15 focus:bg-white/[0.04] transition-all leading-relaxed"
                    style={{ minHeight: "120px" }}
                  />
                </div>

                {/* Model Selector */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Model</h4>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className="w-full flex items-center justify-between px-4 py-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[13px] text-white/70 hover:border-white/10 hover:bg-white/[0.04] transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                          <Zap size={14} className="text-white/40" />
                        </div>
                        <div className="text-left">
                          <p className="text-white/80">{selectedModel.name}</p>
                          <p className="text-[10px] text-white/30">{selectedModel.description}</p>
                        </div>
                      </div>
                      <ChevronDown size={14} className={`text-white/30 transition-transform ${showModelDropdown ? "rotate-180" : ""}`} />
                    </button>
                    {showModelDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f0f0f] border border-white/[0.06] rounded-xl overflow-hidden z-50 shadow-2xl">
                        {MODELS.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              if (model.enabled) {
                                setSelectedModel(model);
                                setShowModelDropdown(false);
                              }
                            }}
                            disabled={!model.enabled}
                            className={`w-full px-4 py-3 text-left border-b border-white/[0.03] last:border-0 transition-colors ${
                              model.enabled
                                ? "hover:bg-white/[0.04] cursor-pointer"
                                : "opacity-40 cursor-not-allowed"
                            }`}
                          >
                            <p className="text-[13px] text-white/70">{model.name}</p>
                            <p className="text-[10px] text-white/30">{model.description}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Settings Group */}
                <div className="bg-white/[0.01] rounded-xl border border-white/[0.04] p-4 space-y-4">
                  {/* Duration (hidden for edit-video — input truncated to 8s automatically) */}
                  {!isGrokEditVideo && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <Clock size={13} className="text-white/30" />
                      </div>
                      <span className="text-[12px] text-white/40">Duration</span>
                    </div>
                    {isAnimateX ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={animateXDuration}
                          onChange={(e) => setAnimateXDuration(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                          min={1}
                          max={30}
                          className="w-16 px-2 py-1.5 text-[11px] text-white/70 bg-white/[0.03] border border-white/[0.04] rounded-lg text-center placeholder:text-white/20 focus:outline-none focus:border-white/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] text-white/25">sec</span>
                      </div>
                    ) : (isGrokVideo || isGrokTextToVideo) ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={grokDuration}
                          onChange={(e) => setGrokDuration(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
                          min={1}
                          max={15}
                          className="w-16 px-2 py-1.5 text-[11px] text-white/70 bg-white/[0.03] border border-white/[0.04] rounded-lg text-center placeholder:text-white/20 focus:outline-none focus:border-white/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] text-white/25">sec (1-15)</span>
                      </div>
                    ) : (
                      <div className="flex bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.04]">
                        {DURATIONS.map((d) => (
                          <button
                            key={d}
                            onClick={() => setDuration(d)}
                            className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                              duration === d
                                ? "bg-white/[0.1] text-white/90"
                                : "text-white/30 hover:text-white/50"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  )}

                  {/* FPS (Animate X only) */}
                  {isAnimateX && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                          <Gauge size={13} className="text-white/30" />
                        </div>
                        <span className="text-[12px] text-white/40">FPS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={animateXFps}
                          onChange={(e) => setAnimateXFps(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                          min={1}
                          max={30}
                          className="w-16 px-2 py-1.5 text-[11px] text-white/70 bg-white/[0.03] border border-white/[0.04] rounded-lg text-center placeholder:text-white/20 focus:outline-none focus:border-white/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] text-white/25">fps</span>
                      </div>
                    </div>
                  )}

                  {/* Aspect Ratio (hidden for edit-video) */}
                  {!isGrokEditVideo && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <Maximize2 size={13} className="text-white/30" />
                      </div>
                      <span className="text-[12px] text-white/40">Aspect Ratio</span>
                    </div>
                    <div className="flex flex-wrap bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.04] gap-0.5">
                      {ratioOptions.map((ar) => {
                        const isActive = isGrokVideo ? grokAspectRatio === ar
                          : isGrokTextToVideo ? grokTextToVideoRatio === ar
                          : aspectRatio === ar;
                        return (
                          <button
                            key={ar}
                            onClick={() => {
                              if (isGrokVideo) setGrokAspectRatio(ar as GrokVideoRatio);
                              else if (isGrokTextToVideo) setGrokTextToVideoRatio(ar as GrokTextToVideoRatio);
                              else setAspectRatio(ar as AspectRatio);
                            }}
                            className={`px-2 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                              isActive
                                ? "bg-white/[0.1] text-white/90"
                                : "text-white/30 hover:text-white/50"
                            }`}
                          >
                            {ar}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}

                  {/* Resolution (Grok models only) */}
                  {isAnyGrokVideo && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                          <Gauge size={13} className="text-white/30" />
                        </div>
                        <span className="text-[12px] text-white/40">Resolution</span>
                      </div>
                      <div className="flex bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.04]">
                        {(isGrokEditVideo ? GROK_EDIT_VIDEO_RESOLUTIONS : GROK_VIDEO_RESOLUTIONS).map((res) => (
                          <button
                            key={res}
                            onClick={() => {
                              if (isGrokEditVideo) setGrokEditResolution(res as GrokEditVideoResolution);
                              else setGrokResolution(res as typeof GROK_VIDEO_RESOLUTIONS[number]);
                            }}
                            className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                              (isGrokEditVideo ? grokEditResolution : grokResolution) === res
                                ? "bg-white/[0.1] text-white/90"
                                : "text-white/30 hover:text-white/50"
                            }`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seed */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <Hash size={13} className="text-white/30" />
                      </div>
                      <span className="text-[12px] text-white/40">Seed</span>
                    </div>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="Random"
                      min={0}
                      max={4294967295}
                      className="w-28 px-3 py-1.5 text-[11px] text-white/70 bg-white/[0.03] border border-white/[0.04] rounded-lg text-right placeholder:text-white/20 focus:outline-none focus:border-white/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {generationError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-[11px] text-red-300">{generationError}</p>
                    <button onClick={() => setGenerationError(null)} className="ml-auto text-red-400/60 hover:text-red-300">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Generate / Cancel Button */}
            <div className="p-4 border-t border-white/[0.03] bg-[#080808]">
              {isGenerating ? (
                <div className="space-y-3">
                  <button
                    onClick={handleCancel}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                  >
                    <X size={16} className="text-red-400" />
                    <span className="text-[13px] font-medium text-red-300">Cancel Generation</span>
                  </button>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={12} className="text-white/40 animate-spin" />
                    <span className="text-[10px] text-white/30">{taskProgress}</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={
                    isGrokTextToVideo ? !prompt.trim()
                    : isGrokEditVideo ? !videoFile
                    : !uploadedFile
                  }
                  className="w-full group relative overflow-hidden"
                >
                  {(() => {
                    const canGenerate = isGrokTextToVideo ? !!prompt.trim()
                      : isGrokEditVideo ? !!videoFile
                      : !!uploadedFile;
                    return (<>
                  <div className={`absolute inset-0 rounded-xl transition-all duration-500 ${
                    !canGenerate
                      ? "bg-white/[0.05]"
                      : "bg-gradient-to-r from-white/90 via-white to-white/90"
                  }`} />
                  <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    !canGenerate ? "" : "shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  }`} />
                  <div className={`relative flex items-center justify-center gap-2.5 py-3.5 rounded-xl transition-all ${
                    !canGenerate ? "" : "group-hover:scale-[1.02]"
                  }`}>
                    <Sparkles size={16} className={`transition-colors ${canGenerate ? "text-black/70" : "text-white/40"}`} />
                    <span className={`text-[13px] font-semibold ${canGenerate ? "text-black" : "text-white/40"}`}>
                      {isGrokEditVideo ? "Edit Video" : "Generate Video"}
                    </span>
                  </div>
                  </>);
                  })()}
                </button>
              )}
            </div>
          </aside>

          {/* Video Gallery — full width */}
          <main className="flex-1 bg-[#050505] overflow-y-auto custom-scrollbar">
            <div className="p-6">
              {generatedVideos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-24">
                  <div className="w-20 h-20 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-5">
                    <Film size={32} className="text-white/15" />
                  </div>
                  <h3 className="text-[16px] font-medium text-white/40 mb-2">No generations yet</h3>
                  <p className="text-[13px] text-white/20 max-w-xs">Upload an image and generate your first video</p>
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid grid-cols-1 xl:grid-cols-2 gap-5" : "space-y-4"}>
                  {generatedVideos.map((item) => (
                    <VideoCard
                      key={item.id}
                      item={item}
                      viewMode={viewMode}
                      isPlaying={playingVideoId === item.id}
                      onOpenLightbox={() => setLightboxVideo(item)}
                      onTogglePlay={() => setPlayingVideoId((prev) => (prev === item.id ? null : item.id))}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ── Video Lightbox ──────────────────────────────────────────────── */}
      {lightboxVideo && (
        <div
          className="fixed inset-0 z-[200] bg-black/97 backdrop-blur-2xl flex items-center justify-center animate-fadeIn"
          onClick={() => setLightboxVideo(null)}
        >
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxVideo(null); }}
            className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/[0.06] hover:bg-white/[0.15] flex items-center justify-center text-white/50 hover:text-white transition-all duration-200 z-20"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-16 max-w-[90vw] max-h-[88vh] px-12" onClick={(e) => e.stopPropagation()}>
            {/* Video Player */}
            <div className="flex-shrink-0 max-w-[60vw] max-h-[85vh] flex items-center justify-center">
              {lightboxVideo.status === "completed" && lightboxVideo.url ? (
                <video
                  src={lightboxVideo.url}
                  className="max-w-full max-h-[85vh] rounded-xl"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : lightboxVideo.thumbnail ? (
                <div className="relative">
                  <img src={lightboxVideo.thumbnail} alt="" className="max-w-full max-h-[85vh] rounded-xl opacity-60" />
                  {lightboxVideo.status === "generating" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-3 px-6 py-3 bg-black/80 backdrop-blur-sm rounded-full border border-white/10">
                        <Loader2 size={16} className="text-amber-400 animate-spin" />
                        <span className="text-[13px] text-amber-200/80">Generating...</span>
                      </div>
                    </div>
                  )}
                  {lightboxVideo.status === "failed" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-3 px-6 py-3 bg-black/80 backdrop-blur-sm rounded-full border border-red-500/20">
                        <AlertCircle size={16} className="text-red-400" />
                        <span className="text-[13px] text-red-300">{lightboxVideo.error || "Failed"}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-[640px] aspect-video bg-white/[0.02] rounded-xl flex items-center justify-center border border-white/[0.04]">
                  <Film size={48} className="text-white/10" />
                </div>
              )}
            </div>

            {/* Metadata Panel */}
            <div className="flex-shrink-0 w-[280px] flex flex-col justify-center py-8 space-y-10">
              {/* Prompt */}
              {lightboxVideo.prompt && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em]">Prompt</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(lightboxVideo.prompt || "")}
                      className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-white/30 hover:text-white/70 transition-all duration-200"
                      title="Copy prompt"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                  </div>
                  <p className="text-[13px] text-white/80 font-light leading-[1.7]">{lightboxVideo.prompt}</p>
                </div>
              )}

              {/* Details */}
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">Model</p>
                  <p className="text-[13px] text-white/90 font-medium">{lightboxVideo.model}</p>
                </div>

                <div className="flex gap-10">
                  <div>
                    <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">Duration</p>
                    <p className="text-[13px] text-white/90 font-medium">{lightboxVideo.duration}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">Ratio</p>
                    <p className="text-[13px] text-white/90 font-medium">{lightboxVideo.aspectRatio}</p>
                  </div>
                  {lightboxVideo.seed != null && (
                    <div>
                      <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">Seed</p>
                      <p className="text-[13px] text-white/90 font-medium">{lightboxVideo.seed}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">Status</p>
                  <p className={`text-[13px] font-medium ${
                    lightboxVideo.status === "completed" ? "text-emerald-400" :
                    lightboxVideo.status === "generating" ? "text-amber-400" : "text-red-400"
                  }`}>
                    {lightboxVideo.status === "completed" ? "Completed" : lightboxVideo.status === "generating" ? "Generating..." : "Failed"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">Created</p>
                  <p className="text-[13px] text-white/90 font-medium">{lightboxVideo.createdAt}</p>
                </div>
              </div>

              {/* Actions */}
              {lightboxVideo.status === "completed" && lightboxVideo.url && (
                <div className="space-y-3 pt-2">
                  <a
                    href={lightboxVideo.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-full bg-white text-black text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all duration-200"
                  >
                    <Download size={13} /> Download
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Helper Components ────────────────────────────────────────────────────────

const MetadataRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[11px] text-white/25">{label}</span>
    <span className="text-[11px] text-white/60">{value}</span>
  </div>
);

const VideoCard = ({
  item,
  viewMode,
  isPlaying,
  onOpenLightbox,
  onTogglePlay,
}: {
  item: GeneratedVideo;
  viewMode: ViewMode;
  isPlaying: boolean;
  onOpenLightbox: () => void;
  onTogglePlay: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden border border-white/[0.05] bg-white/[0.01] transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] cursor-pointer ${
        viewMode === "list" ? "flex gap-5 p-4" : ""
      }`}
    >
      {/* Thumbnail / Video */}
      <div
        className={`relative overflow-hidden ${viewMode === "list" ? "w-64 h-40 rounded-xl flex-shrink-0" : "aspect-video"}`}
        onClick={(e) => {
          if (item.status === "completed" && item.url) {
            e.stopPropagation();
            onTogglePlay();
          }
        }}
      >
        {item.status === "completed" && item.url ? (
          <>
            <video
              ref={videoRef}
              src={item.url}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              poster={item.thumbnail}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-60 group-hover:opacity-40 transition-opacity" />
            {/* Play/Pause overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                {isPlaying ? (
                  <Pause size={22} className="text-white fill-white" />
                ) : (
                  <Play size={22} className="text-white fill-white ml-0.5" />
                )}
              </div>
            </div>
          </>
        ) : item.thumbnail ? (
          <>
            <img src={item.thumbnail} alt={item.prompt} className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-white/[0.02] flex items-center justify-center min-h-[180px]">
            <Film size={28} className="text-white/10" />
          </div>
        )}

        {/* Status Badge */}
        {item.status === "generating" && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 backdrop-blur-sm">
            <Loader2 size={12} className="text-amber-400 animate-spin" />
            <span className="text-[11px] text-amber-200/80 font-medium">Generating</span>
          </div>
        )}
        {item.status === "failed" && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 backdrop-blur-sm">
            <AlertCircle size={12} className="text-red-400" />
            <span className="text-[11px] text-red-200/80 font-medium">Failed</span>
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
          <span className="text-[11px] text-white/80 font-medium">{item.duration}</span>
        </div>

        {/* Expand button — opens lightbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenLightbox(); }}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/50 opacity-0 group-hover:opacity-100 transition-all hover:text-white hover:bg-black/80"
          title="View full screen"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Info */}
      <div
        className={viewMode === "list" ? "flex-1 py-1 flex flex-col justify-center" : "px-4 py-3.5"}
        onClick={onOpenLightbox}
      >
        <p className="text-[13px] text-white/60 line-clamp-2 mb-2.5 leading-relaxed">{item.prompt}</p>
        <div className="flex items-center gap-3 text-[11px] text-white/30">
          <span className="text-white/50">{item.model}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>{item.aspectRatio}</span>
          {item.seed != null && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>Seed: {item.seed}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
