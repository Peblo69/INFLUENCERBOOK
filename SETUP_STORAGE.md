# 🪣 Supabase Storage Buckets Setup

## ⚠️ Error You're Seeing:
```
StorageApiError: Bucket not found
```

This means the storage buckets haven't been created in your Supabase project yet.

---

## 🚀 **OPTION 1: Use Supabase Dashboard (EASIEST)**

### Step 1: Go to Supabase Dashboard
1. Visit: https://supabase.com/dashboard
2. Select your project: **fonzxpqtsdfhvlyvqjru**

### Step 2: Navigate to Storage
1. Click **Storage** in the left sidebar
2. You'll see an empty buckets list

### Step 3: Create Each Bucket

**Create 4 buckets with these EXACT settings:**

#### Bucket 1: training-images
- Click **"New bucket"**
- **Name**: `training-images`
- **Public bucket**: ✅ **CHECKED**
- **File size limit**: `1000` MB (1GB)
- **Allowed MIME types**: `application/zip, application/x-zip-compressed`
- Click **"Create bucket"**

#### Bucket 2: generated-images
- Click **"New bucket"**
- **Name**: `generated-images`
- **Public bucket**: ✅ **CHECKED**
- **File size limit**: `10` MB
- **Allowed MIME types**: `image/jpeg, image/jpg, image/png, image/webp`
- Click **"Create bucket"**

#### Bucket 3: lora-models
- Click **"New bucket"**
- **Name**: `lora-models`
- **Public bucket**: ✅ **CHECKED**
- **File size limit**: `500` MB
- **Allowed MIME types**: Leave empty (or add `application/octet-stream`)
- Click **"Create bucket"**

#### Bucket 4: avatars
- Click **"New bucket"**
- **Name**: `avatars`
- **Public bucket**: ✅ **CHECKED**
- **File size limit**: `5` MB
- **Allowed MIME types**: `image/jpeg, image/jpg, image/png, image/webp`
- Click **"Create bucket"**

### Step 4: Set Up Policies

For each bucket, you need to add policies:

1. Click on a bucket name
2. Click **"Policies"** tab
3. Click **"New policy"**
4. Choose template: **"Allow public read access"**
5. Click **"Review"**
6. Click **"Save policy"**

Then add upload/delete policies:

1. Click **"New policy"** again
2. Choose **"Create a policy from scratch"**
3. **Policy name**: `Allow authenticated uploads`
4. **Target roles**: `authenticated`
5. **Policy command**: `INSERT`
6. **WITH CHECK expression**: `true`
7. Click **"Save policy"**

Repeat for each bucket.

---

## 🚀 **OPTION 2: Use SQL Editor (FASTER)**

### Step 1: Open SQL Editor
1. Go to Supabase Dashboard
2. Click **"SQL Editor"** in left sidebar
3. Click **"New query"**

### Step 2: Run the Setup Script
1. Copy the contents of `supabase/setup-storage.sql`
2. Paste into SQL Editor
3. Click **"Run"** (or press Ctrl+Enter)

**This will create all 4 buckets + policies in one go!**

---

## 🚀 **OPTION 3: Use Supabase CLI (ADVANCED)**

### Install Supabase CLI
```bash
npm install -g supabase
```

### Run Setup
```bash
npx supabase db push
```

This will apply all migrations and setup storage.

---

## ✅ **Verify Setup**

After creating buckets, verify by checking:

1. **Storage Dashboard** → You should see 4 buckets:
   - training-images
   - generated-images
   - lora-models
   - avatars

2. **Test Upload** → Go back to your app and try uploading a ZIP again

---

## 🔧 **Bucket Details**

| Bucket | Purpose | Public | Size Limit | MIME Types |
|--------|---------|--------|------------|------------|
| **training-images** | Store ZIP files for LoRA training | ✅ Yes | 1 GB | application/zip |
| **generated-images** | Store AI-generated images | ✅ Yes | 10 MB | image/* |
| **lora-models** | Store trained LoRA model files | ✅ Yes | 500 MB | application/octet-stream |
| **avatars** | Store user profile pictures | ✅ Yes | 5 MB | image/* |

---

## 🐛 **Troubleshooting**

### If you still get "Bucket not found":
1. Check bucket names are EXACTLY: `training-images`, `generated-images`, `lora-models`, `avatars`
2. Make sure buckets are **public**
3. Refresh your app (hard refresh: Ctrl+Shift+R)
4. Check Supabase URL in `.env` matches your project

### If uploads fail with "Permission denied":
1. Go to bucket → Policies tab
2. Make sure you have:
   - **SELECT policy** for `public` or `authenticated`
   - **INSERT policy** for `authenticated`
   - **DELETE policy** for `authenticated`

### If file size is too large:
- Training ZIPs: Max 1 GB
- Generated images: Max 10 MB each
- LoRA models: Max 500 MB
- Avatars: Max 5 MB

---

## 📝 **Quick Checklist**

- [ ] Created `training-images` bucket
- [ ] Created `generated-images` bucket
- [ ] Created `lora-models` bucket
- [ ] Created `avatars` bucket
- [ ] All buckets are PUBLIC
- [ ] Policies are set up
- [ ] Tested upload in app
- [ ] No more errors! 🎉

---

**Once done, go back to http://localhost:5173/models and try uploading again!**
