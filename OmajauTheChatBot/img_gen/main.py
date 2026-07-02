from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
import io, base64, torch
from contextlib import nullcontext
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request, Response

app = FastAPI()

# Add CORS Middleware to allow requests from Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_name = "dreamlike-art/dreamlike-photoreal-2.0"
device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if device=="cuda" else torch.float32

pipe = StableDiffusionPipeline.from_pretrained(model_name, torch_dtype=dtype).to(device)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
pipe.enable_attention_slicing()


limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=os.environ.get("REDIS_URL", "memory://"),
    strategy="fixed-window",
    headers_enabled=True,
)


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.get("/")
@limiter.limit("5/minute")
async def read_root(request: Request, response: Response):
     return {"Hello": "World"}

@app.get("/generate_stream")
@limiter.limit("2/minute")
async def generate_stream(request: Request, prompt: str = "A Blue leafy tree"):
    negative_prompt = "blurry, low quality, deformed, bad hands, watermark, text"
    generator = torch.Generator(device=device).manual_seed(42)
    total_steps = 20 if device == "cuda" else 15

    def event_stream():
        context = torch.autocast("cuda") if device == "cuda" else nullcontext()
        with context:

            for step in range(total_steps):
                percent = int((step / total_steps) * 100)
                yield f"data: progress:{percent}\n\n"

            # Generate final image
            image = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                width=512,
                height=512,
                num_inference_steps=total_steps,
                guidance_scale=7.5,
                generator=generator
            ).images[0]

            # Convert image to base64
            buf = io.BytesIO()
            image.save(buf, format="PNG")
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode()
            yield f"data: done:data:image/png;base64,{img_base64}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

