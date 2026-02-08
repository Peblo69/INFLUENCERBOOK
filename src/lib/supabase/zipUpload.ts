/**
 * ZIP File Upload Helper
 * Upload ZIP files directly to Supabase Storage for LoRA training
 */

import { supabase } from "@/lib/supabase";
import JSZip from "jszip";

const BUCKET_NAME = 'training-images';

/**
 * Validate ZIP file contains images
 */
export const validateZipFile = async (zipFile: File): Promise<{ valid: boolean; error?: string; imageCount?: number }> => {
  try {
    // Check file size (max 1GB)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (zipFile.size > maxSize) {
      return { valid: false, error: `ZIP file too large: ${(zipFile.size / 1024 / 1024).toFixed(2)}MB. Max: 1GB` };
    }

    // Load ZIP file
    const zip = new JSZip();
    const zipData = await zip.loadAsync(zipFile);

    // Count image files
    let imageCount = 0;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    for (const filename in zipData.files) {
      const file = zipData.files[filename];
      if (!file.dir) {
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        if (imageExtensions.includes(ext)) {
          imageCount++;
        }
      }
    }

    // Validate image count
    if (imageCount < 10) {
      return { valid: false, error: `ZIP must contain at least 10 images. Found: ${imageCount}` };
    }

    if (imageCount > 100) {
      return { valid: false, error: `ZIP must contain maximum 100 images. Found: ${imageCount}` };
    }

    return { valid: true, imageCount };

  } catch (error: any) {
    console.error("ZIP validation error:", error);
    return { valid: false, error: "Failed to read ZIP file. Make sure it's a valid ZIP archive." };
  }
};

/**
 * Upload ZIP file directly to Supabase Storage
 */
export const uploadZipFile = async (zipFile: File): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `${user.id}/training-${timestamp}-${randomStr}.zip`;

    console.log(`📦 Uploading ZIP file: ${(zipFile.size / 1024 / 1024).toFixed(2)} MB`);

    // Upload ZIP to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, zipFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/zip'
      });

    if (error) {
      console.error("ZIP upload error:", error);
      throw error;
    }

    // Training images bucket is private; return the storage path.
    const storagePath = data.path;

    console.log(`ZIP uploaded successfully: ${storagePath}`);

    return storagePath;

  } catch (error: any) {
    console.error("Failed to upload ZIP:", error);
    throw error;
  }
};

/**
 * Extract images from ZIP for preview (optional)
 */
export const extractZipPreviews = async (zipFile: File, maxPreviews: number = 5): Promise<string[]> => {
  try {
    const zip = new JSZip();
    const zipData = await zip.loadAsync(zipFile);

    const previews: string[] = [];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    for (const filename in zipData.files) {
      const file = zipData.files[filename];
      if (!file.dir) {
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        if (imageExtensions.includes(ext)) {
          const blob = await file.async('blob');
          const url = URL.createObjectURL(blob);
          previews.push(url);

          if (previews.length >= maxPreviews) {
            break;
          }
        }
      }
    }

    return previews;

  } catch (error) {
    console.error("Failed to extract previews:", error);
    return [];
  }
};
