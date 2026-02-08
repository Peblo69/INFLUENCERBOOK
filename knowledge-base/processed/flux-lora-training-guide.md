---
title: FLUX LoRA Training Complete Guide
category: lora-training
tags: [flux, lora, training, fal.ai, realistic]
source: compiled from community guides
date: 2025-02-05
---

# FLUX LoRA Training Guide

## What is a LoRA?

LoRA (Low-Rank Adaptation) is a technique to customize AI image models without retraining the entire model. For AI influencers, LoRAs let you create a consistent character that the AI can generate in any pose, outfit, or setting.

## Why FLUX for AI Influencers?

FLUX Pro is currently the best model for realistic AI influencer content:
- Photorealistic skin textures
- Accurate anatomy
- Consistent lighting
- Better hands and fingers than SD
- Native 1024x1024+ resolution

## Training Requirements

### Dataset Preparation

**Minimum images:** 15-20 high quality images
**Recommended:** 30-50 images for best results

**Image requirements:**
- Resolution: 1024x1024 minimum (2048x2048 preferred)
- Format: PNG or high-quality JPG
- Variety: Different angles, lighting, expressions
- Consistency: Same person/character throughout
- Clean backgrounds preferred but not required

### Recommended Dataset Composition

| Type | Count | Purpose |
|------|-------|---------|
| Face close-ups | 8-10 | Facial features |
| Upper body | 8-10 | Body proportions |
| Full body | 5-8 | Full figure |
| Different angles | 5-8 | 3D understanding |
| Different lighting | 5-8 | Lighting adaptation |

## Training Parameters

### For fal.ai FLUX LoRA Training

```json
{
  "trigger_word": "ohwx woman",
  "steps": 1000,
  "learning_rate": 0.0001,
  "lora_rank": 16,
  "batch_size": 1,
  "resolution": 1024
}
```

### Parameter Explanations

**Trigger Word**
- Use unique, uncommon word like "ohwx" or "sks"
- Combine with subject type: "ohwx woman", "sks person"
- Avoid common words that might conflict

**Steps**
- 800-1200 for face/character LoRAs
- More steps = more memorization (can overfit)
- Fewer steps = more flexible but less accurate

**Learning Rate**
- 0.0001 (1e-4) is safe default
- Lower (5e-5) for more subtle training
- Higher (2e-4) risks overfitting

**LoRA Rank**
- 16 is good balance
- 32 for more detail capacity
- 8 for smaller file size

## Common Issues & Fixes

### Issue: Face looks different each generation
**Cause:** Not enough face close-ups in dataset
**Fix:** Add more face images from different angles

### Issue: Body proportions are wrong
**Cause:** Inconsistent body images in dataset
**Fix:** Ensure consistent body type across all images

### Issue: LoRA doesn't activate
**Cause:** Trigger word not in prompt
**Fix:** Always include your trigger word at the start of prompts

### Issue: Overfitting (copies training images exactly)
**Cause:** Too many steps or too high learning rate
**Fix:** Reduce steps to 800, lower learning rate to 5e-5

## Prompting with Your LoRA

### Basic Structure
```
[trigger_word] [subject description], [scene/setting], [lighting], [camera], [style modifiers]
```

### Example Prompts

**Portrait:**
```
ohwx woman, beautiful portrait, soft natural lighting, shallow depth of field, professional photography, 8k uhd
```

**Full Body:**
```
ohwx woman wearing elegant black dress, standing in modern apartment, golden hour lighting, full body shot, fashion photography
```

**Lifestyle:**
```
ohwx woman sitting at cafe, drinking coffee, candid shot, natural lighting, lifestyle photography, instagram style
```

## LoRA Strength Settings

| Strength | Effect | Use Case |
|----------|--------|----------|
| 0.5-0.7 | Subtle influence | More creative freedom |
| 0.8-1.0 | Balanced | Standard use |
| 1.0-1.2 | Strong | Maximum likeness |
| 1.3+ | Overpowering | Usually too much |

## Stacking Multiple LoRAs

You can combine LoRAs for different effects:

1. **Character LoRA** (strength 0.9) - Your main character
2. **Style LoRA** (strength 0.5) - Photography style
3. **Pose LoRA** (strength 0.3) - Specific poses

Total combined strength should stay under 1.5-1.8 to avoid artifacts.

## Storage and Organization

- Keep original training images backed up
- Name LoRAs descriptively: `character-name_v1_1000steps.safetensors`
- Track training parameters for each version
- Test extensively before using in production

## Quality Checklist

Before using a LoRA in production:

- [ ] Face is consistent across 10+ generations
- [ ] Body proportions are accurate
- [ ] Works with different prompts
- [ ] No obvious artifacts
- [ ] Works at different LoRA strengths
- [ ] Compatible with your target model version
