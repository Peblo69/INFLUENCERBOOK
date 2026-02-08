/**
 * Supabase Storage Helpers
 * Upload images, ZIPs, and LoRA files to Supabase Storage
 */

import { supabase } from "@/lib/supabase";
import JSZip from "jszip";

// ============================================
// STORAGE BUCKET NAMES
// ============================================

export const BUCKETS = {
  GENERATED_IMAGES: 'generated-images',
  LORA_MODELS: 'lora-models',
  TRAINING_IMAGES: 'training-images',
  AVATARS: 'avatars',
} as const;

// ============================================
// IMAGE UPLOAD FUNCTIONS
// ============================================

/**
 * Upload a single image to generated-images bucket
 */
export const uploadGeneratedImage = async (
  file: File | Blob,
  fileName?: string
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = file instanceof File ? file.name.split('.').pop() : 'jpg';
    const finalFileName = fileName || `${user.id}/${timestamp}-${randomStr}.${extension}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from(BUCKETS.GENERATED_IMAGES)
      .upload(finalFileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file instanceof File ? file.type : 'image/jpeg'
      });

    if (error) {
      console.error("Error uploading image:", error);
      throw error;
    }

    // Training images bucket is private; return the storage path.
    const storagePath = data.path;

    console.log(`ZIP uploaded successfully: ${storagePath}`);

    return storagePath;
  } catch (error) {
    console.error("Failed to upload image:", error);
    return null;
  }
};

/**
 * Upload multiple images to generated-images bucket
 */
export const uploadGeneratedImages = async (
  files: (File | Blob)[]
): Promise<string[]> => {
  try {
    const uploadPromises = files.map(file => uploadGeneratedImage(file));
    const results = await Promise.all(uploadPromises);
    return results.filter((url): url is string => url !== null);
  } catch (error) {
    console.error("Failed to upload multiple images:", error);
    return [];
  }
};

/**
 * Upload avatar image
 */
export const uploadAvatar = async (
  file: File | Blob
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const fileName = `${user.id}/avatar-${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from(BUCKETS.AVATARS)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file instanceof File ? file.type : 'image/jpeg'
      });

    if (error) {
      console.error("Error uploading avatar:", error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKETS.AVATARS)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Failed to upload avatar:", error);
    return null;
  }
};

// ============================================
// TRAINING IMAGES / ZIP FUNCTIONS
// ============================================

/**
 * Create ZIP file from multiple image files
 */
export const createZipFromImages = async (
  files: File[]
): Promise<Blob> => {
  const zip = new JSZip();

  // Add each file to the ZIP
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const extension = file.name.split('.').pop() || 'jpg';
    // Use numbered filenames for consistency
    const fileName = `image_${String(i + 1).padStart(3, '0')}.${extension}`;
    zip.file(fileName, file);
  }

  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return zipBlob;
};

/**
 * Upload training images as ZIP file
 */
export const uploadTrainingImagesZip = async (
  files: File[]
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Validate files
    if (files.length < 10) {
      throw new Error("At least 10 images required for training");
    }

    if (files.length > 100) {
      throw new Error("Maximum 100 images allowed");
    }

    // Create ZIP
    console.log(`Creating ZIP from ${files.length} images...`);
    const zipBlob = await createZipFromImages(files);

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${user.id}/training-${timestamp}.zip`;

    console.log(`Uploading ZIP (${(zipBlob.size / 1024 / 1024).toFixed(2)} MB)...`);

    // Upload ZIP
    const { data, error } = await supabase.storage
      .from(BUCKETS.TRAINING_IMAGES)
      .upload(fileName, zipBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/zip'
      });

    if (error) {
      console.error("Error uploading training ZIP:", error);
      throw error;
    }

    // Training images bucket is private; return the storage path.
    const storagePath = data.path;

    console.log(`ZIP uploaded successfully: ${storagePath}`);

    return storagePath;
  } catch (error) {
    console.error("Failed to upload training images ZIP:", error);
    throw error;
  }
};

// ============================================
// LORA FILE FUNCTIONS
// ============================================

/**
 * Upload LoRA model file
 */
export const uploadLoRAFile = async (
  file: File | Blob,
  fileName?: string
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const timestamp = Date.now();
    const finalFileName = fileName || `${user.id}/lora-${timestamp}.safetensors`;

    const { data, error } = await supabase.storage
      .from(BUCKETS.LORA_MODELS)
      .upload(finalFileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/octet-stream'
      });

    if (error) {
      console.error("Error uploading LoRA file:", error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKETS.LORA_MODELS)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Failed to upload LoRA file:", error);
    return null;
  }
};

// ============================================
// DELETE FUNCTIONS
// ============================================

/**
 * Delete file from storage
 */
export const deleteFile = async (
  bucket: string,
  filePath: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error("Error deleting file:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Failed to delete file:", error);
    return false;
  }
};

/**
 * Delete multiple files from storage
 */
export const deleteFiles = async (
  bucket: string,
  filePaths: string[]
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(filePaths);

    if (error) {
      console.error("Error deleting files:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Failed to delete files:", error);
    return false;
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get file path from public URL
 */
export const getFilePathFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Remove /storage/v1/object/public/{bucket}/ from the path
    return pathParts.slice(5).join('/');
  } catch (error) {
    console.error("Failed to parse URL:", error);
    return '';
  }
};

/**
 * Download file from URL as Blob
 */
export const downloadFileAsBlob = async (url: string): Promise<Blob | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error) {
    console.error("Failed to download file:", error);
    return null;
  }
};

/**
 * Convert Blob URL to File
 */
export const blobUrlToFile = async (
  blobUrl: string,
  fileName: string
): Promise<File | null> => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
  } catch (error) {
    console.error("Failed to convert blob URL to file:", error);
    return null;
  }
};

/**
 * Convert File to Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data:image/jpeg;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Validate image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP` };
  }

  if (file.size > maxSize) {
    return { valid: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 10MB` };
  }

  return { valid: true };
};

/**
 * Validate multiple image files
 */
export const validateImageFiles = (files: File[]): { valid: boolean; error?: string } => {
  for (const file of files) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { valid: false, error: `${file.name}: ${validation.error}` };
    }
  }

  return { valid: true };
};

