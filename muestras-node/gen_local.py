# Genera fotos en local con un modelo gratuito (SD 1.5 DreamShaper 8, CreativeML OpenRAIL-M).
# Uso: .venv\Scripts\python.exe gen_local.py <sitio> <nombre> "<prompt>" [--ancho 768] [--alto 960] [--pasos 28]
import argparse
from pathlib import Path
import os

# Cachés y temporales en D:. Asignación forzada: el entorno del sistema apunta a C: y A:.
os.environ["HF_HOME"] = r"d:\hf-cache"
os.environ["HF_HUB_CACHE"] = r"d:\hf-cache\hub"
os.environ["TRANSFORMERS_CACHE"] = r"d:\hf-cache\transformers"
os.environ["TMP"] = r"d:\hf-tmp"
os.environ["TEMP"] = r"d:\hf-tmp"

import torch
from diffusers import StableDiffusionPipeline

MODELO = "Lykon/dreamshaper-8"
AQUI = Path(__file__).resolve().parent
NEGATIVO = "text, watermark, logo, signature, lowres, blurry, deformed, extra fingers, cartoon, illustration"

parser = argparse.ArgumentParser()
parser.add_argument("sitio")
parser.add_argument("nombre")
parser.add_argument("prompt")
parser.add_argument("--ancho", type=int, default=768)
parser.add_argument("--alto", type=int, default=960)
parser.add_argument("--pasos", type=int, default=28)
parser.add_argument("--semilla", type=int, default=None)
args = parser.parse_args()

if not torch.cuda.is_available():
    raise SystemExit("No hay CUDA disponible. Revisa la instalación de torch cu121.")

pipe = StableDiffusionPipeline.from_pretrained(MODELO, torch_dtype=torch.float16, safety_checker=None)
pipe = pipe.to("cuda")
pipe.enable_attention_slicing()
pipe.enable_vae_slicing()

generador = torch.Generator("cuda")
if args.semilla is not None:
    generador.manual_seed(args.semilla)

imagen = pipe(
    prompt=args.prompt,
    negative_prompt=NEGATIVO,
    width=args.ancho,
    height=args.alto,
    num_inference_steps=args.pasos,
    guidance_scale=6.5,
    generator=generador,
).images[0]

destino = AQUI.parent / "sitio" / "portafolio" / args.sitio / "fotos"
destino.mkdir(parents=True, exist_ok=True)
archivo = destino / f"{args.nombre}.jpg"
imagen.save(archivo, quality=92)
print(f"ok  {archivo}")
