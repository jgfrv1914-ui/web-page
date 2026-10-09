// Copia src/<sitio>/index.html a ../sitio/portafolio/<sitio>/index.html.
// Sin dependencias: solo Node estándar.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "src");
const outDir = resolve(here, "..", "sitio", "portafolio");

const sitios = (await readdir(srcDir, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const nombre of sitios) {
  const html = await readFile(join(srcDir, nombre, "index.html"), "utf8");
  const destino = join(outDir, nombre, "index.html");
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, html, "utf8");
  console.log(`ok  ${nombre} -> ${destino}`);
}

console.log(`${sitios.length} sitios generados.`);
