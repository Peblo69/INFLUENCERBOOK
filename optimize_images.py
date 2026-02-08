import os
from PIL import Image

source_dir = "public"
target_dir = "public/optimized"

if not os.path.exists(target_dir):
    os.makedirs(target_dir)

files = [
    "045e4499-7f30-4047-add2-baf56c6c1df2.png",
    "11798cb4-8416-407f-8436-e4c267038519.png",
    "3a4fb670-67e8-4ffe-828e-8e5a0aecfa3e.png",
    "a98d0ea2-0d80-4f0f-a9dc-151a453eee38.png",
    "bbfd13e9-b279-41e8-a134-6921f7445980.png",
    "c6f77a3a-55f2-49ba-aa61-9b50d101fca6.png",
    "e2b65051-6780-405c-9e93-b8597291e73e.png",
    "fdf0d9fd-4e27-4a99-b34a-bd37744974ab.png"
]

mapping = {
    "045e4499-7f30-4047-add2-baf56c6c1df2.png": "gallery-1.webp",
    "11798cb4-8416-407f-8436-e4c267038519.png": "gallery-2.webp",
    "3a4fb670-67e8-4ffe-828e-8e5a0aecfa3e.png": "gallery-3.webp",
    "a98d0ea2-0d80-4f0f-a9dc-151a453eee38.png": "gallery-4.webp",
    "bbfd13e9-b279-41e8-a134-6921f7445980.png": "gallery-5.webp",
    "c6f77a3a-55f2-49ba-aa61-9b50d101fca6.png": "gallery-6.webp",
    "e2b65051-6780-405c-9e93-b8597291e73e.png": "gallery-7.webp",
    "fdf0d9fd-4e27-4a99-b34a-bd37744974ab.png": "gallery-8.webp"
}

print("Starting optimization...")

for filename in files:
    src_path = os.path.join(source_dir, filename)
    if filename in mapping:
        target_name = mapping[filename]
        target_path = os.path.join(target_dir, target_name)
        
        if os.path.exists(src_path):
            try:
                with Image.open(src_path) as img:
                    # Convert to RGB if RGBA to avoid issues with saving as JPEG/WebP sometimes, though WebP supports transparency.
                    # Keeping RGBA for WebP is fine.
                    
                    # Resize
                    max_width = 1280
                    if img.width > max_width:
                        ratio = max_width / img.width
                        new_height = int(img.height * ratio)
                        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                        print(f"Resized {filename} to {max_width}x{new_height}")
                    
                    # Save as WebP
                    img.save(target_path, "WEBP", quality=80, method=6)
                    print(f"Saved optimized {target_name}")
            except Exception as e:
                print(f"Failed to process {filename}: {e}")
        else:
            print(f"Source file not found: {src_path}")

print("Optimization complete.")

