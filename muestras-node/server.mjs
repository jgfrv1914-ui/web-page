// Servidor de desarrollo sin dependencias. Sirve ../sitio en http://127.0.0.1:3000
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..", "sitio");
const puerto = Number(process.env.PORT) || 3000;

const tipos = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".glb": "model/gltf-binary",
  ".wasm": "application/wasm",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const ruta = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
    let archivo = join(raiz, ruta);
    if (!archivo.startsWith(raiz)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(archivo).catch(() => null);
    if (info?.isDirectory()) archivo = join(archivo, "index.html");
    const data = await readFile(archivo);
    res.writeHead(200, { "Content-Type": tipos[extname(archivo)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("No encontrado");
  }
}).listen(puerto, "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${puerto}/portafolio/`);
});
