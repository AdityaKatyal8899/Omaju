#Model for image generartion (heavy)
import torch
from flask import Flask, request, Response, render_template
from diffusers import StableDiffusionPipeline
import io, base64

app = Flask(__name__)

# Model config
model_name = "dreamlike-art/dreamlike-photoreal-2.0"
device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if device=="cuda" else torch.float32

# Load pipeline
pipe = StableDiffusionPipeline.from_pretrained(model_name, torch_dtype=dtype).to(device)
pipe.enable_attention_slicing()
pipe.enable_model_cpu_offload()  # save VRAM

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate_stream")
def generate_stream():
    prompt = request.args.get("prompt", "A beautiful test image")
    negative_prompt = "blurry, low quality, deformed, bad hands, watermark, text"
    generator = torch.Generator(device=device).manual_seed(42)
    total_steps = 40

    def event_stream():
        with torch.autocast("cuda" if device=="cuda" else "cpu"):
            # We'll simulate per-step progress
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

    return Response(event_stream(), mimetype="text/event-stream")

if __name__ == "__main__":
    app.run(debug=True, port=5000)
