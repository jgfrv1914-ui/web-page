// Genera fotos con Hugging Face (modelo SD3 Medium, licencia Stability Community).
// Uso: node gen-fotos.mjs <sitio> <nombre> "<prompt>"
// Ejemplo: node gen-fotos.mjs cafe espresso "espresso in ceramic cup, warm light, shallow depth of field"
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MODEL = "stabilityai/stable-diffusion-3-medium-diffusers";
const URL_API = `https://router.huggingface.co/hf-inference/models/${MODEL}`;

async function leerToken() {
  if (process.env.HF_TOKEN) return process.env.HF_TOKEN;
  const env = await readFile(resolve(here, "..", ".env"), "utf8").catch(() => "");
  const linea = env.split(/\r?\n/).find((l) => l.startsWith("HF_TOKEN="));
  const token = linea?.slice("HF_TOKEN=".length).trim();
  if (!token) throw new Error("Falta HF_TOKEN (variable de entorno o ../.env)");
  return token;
}

const [sitio, nombre, prompt] = process.argv.slice(2);
if (!sitio || !nombre || !prompt) {
  console.error('Uso: node gen-fotos.mjs <sitio> <nombre> "<prompt>"');
  process.exit(1);
}

const token = await leerToken();
const res = await fetch(URL_API, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "image/jpeg",
  },
  body: JSON.stringify({ inputs: prompt }),
});

if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const destino = resolve(here, "..", "sitio", "portafolio", sitio, "fotos");
await mkdir(destino, { recursive: true });
const archivo = join(destino, `${nombre}.jpg`);
await writeFile(archivo, Buffer.from(await res.arrayBuffer()));
console.log(`ok  ${archivo}`);
