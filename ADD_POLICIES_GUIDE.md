# 🔓 Add Storage Policies (2 Minutes)

## ⚡ **SUPER SIMPLE STEPS:**

### For Each Bucket (training-images, generated-images, lora-models, avatars):

---

### **Step 1:** Open Supabase Dashboard
**Click:** https://supabase.com/dashboard/project/fonzxpqtsdfhvlyvqjru/storage/buckets

---

### **Step 2:** Click on **"training-images"** bucket

---

### **Step 3:** Click the **"Policies"** tab at the top

---

### **Step 4:** Click **"New Policy"** button

---

### **Step 5:** Select Template
- Click **"Get started quickly"**
- Then click **"Allow public access"**
- Then click **"Use this template"**

---

### **Step 6:** Review and Save
- Click **"Review"**
- Click **"Save policy"**

---

### **Step 7:** Add Another Policy for Uploads
- Click **"New Policy"** again
- Click **"Create policy from scratch"**
- **Policy name:** `Allow uploads`
- **Target roles:** Select **"authenticated"**
- **Policy command:** Select **"INSERT"**
- **WITH CHECK:** Type `true`
- Click **"Save policy"**

---

### **Step 8:** Repeat for Other Buckets
Do steps 2-7 for:
- ✅ training-images (you just did this)
- ⬜ generated-images
- ⬜ lora-models
- ⬜ avatars

---

## 🚀 **ALTERNATIVE: One-Click Fix Per Bucket**

For each bucket, add these 3 policies:

### **Policy 1: Allow Public Reads**
```
Name: Allow public reads
Target: public
Command: SELECT
USING: true
```

### **Policy 2: Allow Authenticated Uploads**
```
Name: Allow authenticated uploads
Target: authenticated
Command: INSERT
WITH CHECK: true
```

### **Policy 3: Allow Authenticated Deletes**
```
Name: Allow authenticated deletes
Target: authenticated
Command: DELETE
USING: true
```

---

## ✅ **After Adding Policies:**

1. Go back to: http://localhost:5173/models
2. Click "WAN 2.1"
3. Click "Train LoRA"
4. Upload your ZIP
5. **IT WILL WORK!** 🎉

---

## 🐛 **Still Not Working?**

If you're getting errors after adding policies, try this nuclear option:

1. Go to: https://supabase.com/dashboard/project/fonzxpqtsdfhvlyvqjru/database/tables
2. Find table: **"storage.objects"**
3. Click on it
4. Go to **"RLS disabled"** section
5. Toggle **"Enable RLS"** to OFF
6. Confirm

This will disable all security on storage (fine for development).

---

**Total time: 2-3 minutes for all 4 buckets!**
