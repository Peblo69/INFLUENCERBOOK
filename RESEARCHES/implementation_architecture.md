# Implementation Architecture - Technical Blueprint

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                     │
│                                                                 │
│  Web UI (React/Vue)  │  Mobile App  │  Third-party Integrations│
└────────┬──────────────────────────────────────────────────┬────┘
         │                                                  │
┌────────▼──────────────────────────────────────────────────▼────┐
│                       API GATEWAY LAYER                        │
│                                                                 │
│  FastAPI Server (Async)                                        │
│  - Authentication (JWT tokens)                                 │
│  - Rate limiting (token bucket)                               │
│  - Request validation                                         │
│  - Response caching (Redis)                                   │
└────────┬──────────────────────────────────────────────────┬────┘
         │                                                  │
┌────────▼──────────────────────────────────────────────────▼────┐
│                    ORCHESTRATION LAYER                         │
│                                                                 │
│  Celery Task Broker                                           │
│  - Image generation tasks                                     │
│  - Enhancement/post-processing tasks                          │
│  - LoRA training tasks                                        │
│  - Priority queue management                                 │
│  - Retry logic & error handling                              │
└────────┬──────────────────────────────────────────────────┬────┘
         │                                                  │
┌────────▼──────────┬──────────────────┬────────────────────▼────┐
│   GPU WORKERS     │   WORKERS        │     WORKERS              │
│                   │                  │                          │
│ ComfyUI Instance  │ Enhancement      │ LoRA Training Server    │
│ (Text-to-Image)   │ Workers          │                         │
│                   │ (GFPGAN, etc.)   │ CPU-based Workers       │
│ - Flux            │                  │ (Metadata, compression) │
│ - SDXL            │ GPU Inference    │                         │
│ - SD 1.5          │ Backend          │                         │
└────────┬──────────┴──────────────────┴────────────────────┬────┘
         │                                                  │
┌────────▼──────────────────────────────────────────────────▼────┐
│                    DATA LAYER                                  │
│                                                                 │
│  PostgreSQL      │  Redis Cache  │  S3 Storage  │  CDN         │
│  (User data,     │  (Session,    │  (Images)    │  (Delivery)  │
│   history,       │   queue,      │              │              │
│   settings)      │   results)    │              │              │
└──────────────────────────────────────────────────────────────────┘
```

---

## DETAILED IMPLEMENTATION GUIDE

### 1. API GATEWAY SETUP (FastAPI)

```python
# main.py
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from fastapi_jwt_auth import AuthJWT
from slowapi import Limiter
from slowapi.util import get_remote_address
import aioredis
import logging

app = FastAPI(
    title="Image Generation Platform",
    version="1.0.0",
    description="Advanced AI image generation with ComfyUI"
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

logger = logging.getLogger(__name__)

# ==================== CORE ENDPOINTS ====================

@app.post("/api/v1/generate")
@limiter.limit("10/minute")
async def generate_image(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    authorize: AuthJWT = Depends()
):
    """Advanced text-to-image generation with quality optimization"""
    authorize.jwt_required()
    user_id = authorize.get_jwt_subject()
    
    try:
        # 1. Validate request
        if len(request.prompt) > 1000:
            raise HTTPException(status_code=400, detail="Prompt too long")
        
        # 2. Check cache
        cache_key = f"gen:{user_id}:{hash(request.prompt)}"
        cached = await redis_cache.get(cache_key)
        if cached and not request.bypass_cache:
            logger.info(f"Cache hit for {user_id}")
            return {"cached": True, "image_url": cached}
        
        # 3. Queue generation task
        from tasks import generate_with_enhancement
        task = generate_with_enhancement.delay(
            user_id=user_id,
            prompt=request.prompt,
            model=request.model,
            height=request.height,
            width=request.width,
            enhance_faces=request.enhance_faces,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale,
            seed=request.seed
        )
        
        return {
            "task_id": task.id,
            "status": "queued",
            "estimated_wait": estimate_queue_time(request.model),
            "cost_estimate": calculate_cost(request.model)
        }
    
    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/inpaint")
@limiter.limit("5/minute")
async def inpaint_image(
    base_image: UploadFile = File(...),
    mask_image: UploadFile = File(...),
    request: InpaintRequest = Depends(),
    authorize: AuthJWT = Depends()
):
    """Advanced inpainting with PowerPaint V2"""
    authorize.jwt_required()
    user_id = authorize.get_jwt_subject()
    
    try:
        # 1. Validate and save uploaded files
        base_bytes = await base_image.read()
        mask_bytes = await mask_image.read()
        
        if len(base_bytes) > 50_000_000:  # 50MB limit
            raise HTTPException(status_code=400, detail="Image too large")
        
        # 2. Verify mask format
        mask_img = Image.open(BytesIO(mask_bytes))
        if mask_img.mode not in ['L', '1']:
            mask_bytes = convert_to_binary_mask(mask_bytes)
        
        # 3. Queue inpainting task
        from tasks import inpaint_image_task
        task = inpaint_image_task.delay(
            user_id=user_id,
            base_image_bytes=base_bytes,
            mask_image_bytes=mask_bytes,
            prompt=request.prompt,
            model="powerpaint-v2",
            task_type=request.task_type,
            strength=request.strength
        )
        
        return {
            "task_id": task.id,
            "status": "queued",
            "estimated_time": "15-30 seconds"
        }
    
    except Exception as e:
        logger.error(f"Inpaint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/enhance")
@limiter.limit("10/minute")
async def enhance_image(
    image: UploadFile = File(...),
    enhancement_type: str = Query(...),
    authorize: AuthJWT = Depends()
):
    """Quality enhancement pipeline (face, upscale, denoise)"""
    authorize.jwt_required()
    user_id = authorize.get_jwt_subject()
    
    try:
        image_bytes = await image.read()
        
        from tasks import enhance_image_task
        task = enhance_image_task.delay(
            user_id=user_id,
            image_bytes=image_bytes,
            enhancement_type=enhancement_type
        )
        
        return {
            "task_id": task.id,
            "status": "processing",
            "enhancement_type": enhancement_type
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/batch-generate")
@limiter.limit("2/minute")
async def batch_generate(
    request: BatchGenerateRequest,
    authorize: AuthJWT = Depends()
):
    """Batch generation with priority scheduling"""
    authorize.jwt_required()
    user_id = authorize.get_jwt_subject()
    
    if len(request.prompts) > 100:
        raise HTTPException(status_code=400, detail="Max 100 prompts per batch")
    
    from tasks import batch_generate_task
    
    task_ids = []
    for i, prompt in enumerate(request.prompts):
        task = batch_generate_task.delay(
            user_id=user_id,
            prompt=prompt,
            model=request.model,
            batch_index=i,
            total_batch=len(request.prompts),
            priority=request.priority,
            webhook_url=request.webhook_url
        )
        task_ids.append(task.id)
    
    cost = calculate_batch_cost(len(request.prompts), request.model)
    discount = calculate_discount(user_id, len(request.prompts))
    
    return {
        "batch_id": str(uuid4()),
        "task_ids": task_ids,
        "total_count": len(request.prompts),
        "cost": cost,
        "discount_applied": discount,
        "final_cost": cost - discount
    }


@app.get("/api/v1/task/{task_id}/status")
async def get_task_status(
    task_id: str,
    authorize: AuthJWT = Depends()
):
    """Get real-time task status and progress"""
    authorize.jwt_required()
    user_id = authorize.get_jwt_subject()
    
    # Verify user owns this task
    task_user = await verify_task_ownership(task_id, user_id)
    if not task_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    from celery.result import AsyncResult
    task = AsyncResult(task_id)
    
    if task.state == 'PENDING':
        response = {
            'status': 'queued',
            'queue_position': await get_queue_position(task_id),
            'estimated_wait': '5-10 minutes'
        }
    elif task.state == 'PROGRESS':
        response = {
            'status': 'processing',
            'progress': task.info.get('progress', 0),
            'current_step': task.info.get('current_step', 'Initializing'),
            'estimated_remaining': task.info.get('eta', '3-5 minutes')
        }
    elif task.state == 'SUCCESS':
        response = {
            'status': 'completed',
            'result': task.result,
            'image_url': f"https://cdn.yourplatform.com/{task.result['filename']}",
            'processing_time': task.result.get('duration_seconds', 0)
        }
    elif task.state == 'FAILURE':
        response = {
            'status': 'failed',
            'error': str(task.info),
            'retry_available': True
        }
    
    return response


@app.get("/api/v1/queue/status")
async def get_queue_status(authorize: AuthJWT = Depends()):
    """Get real-time queue statistics"""
    authorize.jwt_required()
    user_id = authorize.get_jwt_subject()
    
    return {
        "total_queued": await get_queue_length(),
        "gpu_workers_active": await get_active_workers(),
        "average_wait_minutes": await calculate_average_wait(),
        "by_model": {
            "flux": {"queued": 45, "avg_wait": "8 min"},
            "sdxl": {"queued": 120, "avg_wait": "15 min"},
            "sd15": {"queued": 200, "avg_wait": "25 min"}
        },
        "your_position": await get_user_queue_position(user_id),
        "premium_fast_track": f"Available"
    }
```

---

### 2. CELERY TASK WORKERS (tasks.py)

```python
# tasks.py
from celery import Celery
from datetime import datetime
import logging

app = Celery(
    'image_platform',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1'
)

logger = logging.getLogger(__name__)


@app.task(bind=True, max_retries=2)
def generate_with_enhancement(
    self,
    user_id,
    prompt,
    model,
    height,
    width,
    enhance_faces=True,
    num_inference_steps=30,
    guidance_scale=7.5,
    seed=-1
):
    """Main image generation with optional quality enhancement"""
    try:
        self.update_state(
            state='PROGRESS',
            meta={'progress': 0, 'current_step': 'Initializing model...'}
        )
        
        # 1. Build ComfyUI workflow
        workflow = build_comfyui_workflow(
            model=model,
            prompt=prompt,
            height=height,
            width=width,
            num_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            seed=seed
        )
        
        self.update_state(
            state='PROGRESS',
            meta={'progress': 10, 'current_step': f'Generating image ({model})...'}
        )
        
        # 2. Execute workflow
        comfyui_result = await call_comfyui_workflow(workflow)
        generated_image_path = comfyui_result['output_images'][0]
        
        self.update_state(
            state='PROGRESS',
            meta={'progress': 60, 'current_step': 'Processing quality enhancement...'}
        )
        
        # 3. Load image for enhancement
        image = Image.open(generated_image_path)
        
        # 4. Face detection and enhancement
        if enhance_faces and has_faces(image):
            self.update_state(
                state='PROGRESS',
                meta={'progress': 70, 'current_step': 'Enhancing faces with GFPGAN...'}
            )
            image = enhance_faces_gfpgan(image)
        
        # 5. Optimize and upload
        self.update_state(
            state='PROGRESS',
            meta={'progress': 85, 'current_step': 'Optimizing and uploading...'}
        )
        
        image = strip_exif_and_optimize(image)
        s3_key = f"images/{user_id}/{datetime.now().isoformat()}/{uuid4()}.png"
        s3_url = await upload_to_s3(image, s3_key)
        
        result = {
            'status': 'completed',
            'image_url': s3_url,
            's3_key': s3_key,
            'model': model,
            'prompt': prompt,
            'enhanced': enhance_faces,
            'timestamp': datetime.now().isoformat()
        }
        
        self.update_state(state='SUCCESS', meta=result)
        return result
    
    except Exception as exc:
        logger.error(f"Generation failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=min(2 ** self.request.retries * 10, 600))


@app.task(bind=True, max_retries=1)
def inpaint_image_task(
    self,
    user_id,
    base_image_bytes,
    mask_image_bytes,
    prompt,
    model,
    task_type,
    strength=0.8
):
    """Advanced inpainting with PowerPaint V2"""
    try:
        self.update_state(
            state='PROGRESS',
            meta={'progress': 0, 'current_step': 'Loading images...'}
        )
        
        # 1. Load and validate images
        base_image = Image.open(BytesIO(base_image_bytes))
        mask_image = Image.open(BytesIO(mask_image_bytes))
        mask_image = mask_image.resize(base_image.size)
        
        self.update_state(
            state='PROGRESS',
            meta={'progress': 20, 'current_step': 'Preparing inpainting model...'}
        )
        
        # 2. Build inpainting workflow
        if task_type == "removal":
            workflow = build_powerpaint_workflow_removal(base_image, mask_image)
        elif task_type == "insertion":
            workflow = build_powerpaint_workflow_insertion(
                base_image, mask_image, prompt
            )
        else:  # outpainting
            workflow = build_powerpaint_workflow_outpainting(base_image, prompt)
        
        self.update_state(
            state='PROGRESS',
            meta={'progress': 40, 'current_step': 'Running inpainting...'}
        )
        
        # 3. Execute inpainting
        result_image_path = await call_comfyui_workflow(workflow)
        result_image = Image.open(result_image_path)
        
        self.update_state(
            state='PROGRESS',
            meta={'progress': 70, 'current_step': 'Post-processing...'}
        )
        
        # 4. Optimize and upload
        result_image = strip_exif_and_optimize(result_image)
        s3_url = await upload_to_s3(result_image, f"inpaint/{user_id}/{uuid4()}.png")
        
        return {
            'status': 'completed',
            'image_url': s3_url,
            'task_type': task_type,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as exc:
        logger.error(f"Inpainting failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=10)


@app.task(bind=True)
def enhance_image_task(
    self,
    user_id,
    image_bytes,
    enhancement_type,
    use_codeformer=False
):
    """Quality enhancement pipeline"""
    try:
        image = Image.open(BytesIO(image_bytes))
        
        if enhancement_type in ["face", "full"]:
            self.update_state(
                state='PROGRESS',
                meta={'current_step': 'Restoring faces...'}
            )
            
            if use_codeformer:
                image = enhance_faces_codeformer(image, creativity=0.5)
            else:
                image = enhance_faces_gfpgan(image)
        
        if enhancement_type in ["upscale", "full"]:
            self.update_state(
                state='PROGRESS',
                meta={'current_step': 'Upscaling image...'}
            )
            image = upscale_with_realesrgan(image, scale=4)
        
        image = strip_exif_and_optimize(image)
        s3_url = await upload_to_s3(image, f"enhanced/{user_id}/{uuid4()}.png")
        
        return {
            'status': 'completed',
            'image_url': s3_url,
            'enhancement_type': enhancement_type,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as exc:
        logger.error(f"Enhancement failed: {str(exc)}")
        raise exc
```

---

### 3. DOCKER DEPLOYMENT

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ComfyUI Backend
  comfyui:
    image: comfyui:latest
    ports:
      - "8188:8188"
    volumes:
      - ./models:/app/models
      - ./output:/app/output
    environment:
      - CUDA_VISIBLE_DEVICES=0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  # FastAPI Server
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://user:pass@postgres:5432/imagedb
    depends_on:
      - redis
      - postgres
    command: uvicorn main:app --host 0.0.0.0 --port 8000

  # Celery Workers (GPU)
  worker-gpu-1:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - CUDA_VISIBLE_DEVICES=0
    depends_on:
      - redis
      - comfyui
    command: celery -A tasks worker --loglevel=info --concurrency=1 -Q gpu_tasks
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  worker-gpu-2:
    build: .
    environment:
      - CUDA_VISIBLE_DEVICES=1
    depends_on:
      - redis
      - comfyui
    command: celery -A tasks worker --loglevel=info --concurrency=1 -Q gpu_tasks
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  # Redis Cache & Broker
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=imagedb
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  redis-data:
  postgres-data:
```

---

## KEY METRICS & MONITORING

```python
# monitoring.py
from prometheus_client import Counter, Histogram, Gauge
import time

# Counters
images_generated = Counter(
    'images_generated_total',
    'Total images generated',
    ['model', 'status']
)

# Histograms
generation_time = Histogram(
    'generation_time_seconds',
    'Time to generate image',
    ['model'],
    buckets=(5, 10, 15, 20, 30, 45, 60)
)

# Gauges
queue_length = Gauge(
    'queue_length',
    'Current queue length',
    ['model']
)

# Record metrics
@app.post("/generate")
async def generate_image(request):
    start = time.time()
    try:
        result = await generate(request)
        duration = time.time() - start
        
        images_generated.labels(model=request.model, status='success').inc()
        generation_time.labels(model=request.model).observe(duration)
        
        return result
    except Exception as e:
        images_generated.labels(model=request.model, status='failed').inc()
        raise
```

---

## PRODUCTION DEPLOYMENT CHECKLIST

- [ ] Load balancing (Nginx/HAProxy)
- [ ] HTTPS/TLS certificates
- [ ] Database backups (automated)
- [ ] Monitoring & alerts
- [ ] Rate limiting per user/IP
- [ ] CORS configuration
- [ ] Logging aggregation (ELK stack)
- [ ] CDN configuration for S3
- [ ] API versioning strategy
- [ ] Database connection pooling
- [ ] Redis persistence
- [ ] GPU monitoring
- [ ] Cost tracking per user
- [ ] Graceful shutdown handlers
- [ ] Circuit breakers for external APIs

---

**This architecture scales from startup to enterprise.**
