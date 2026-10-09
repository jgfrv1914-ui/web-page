// Chat flotante con el asistente de IA del negocio (usa las demos de agenttafurt.xyz).
// Uso: <script type="module">import { montarChat } from "/portafolio/comun/chat.js";
//        montarChat({ slug: "barberia-demo", nombre: "Leo", color: "#c9a227", saludo: "¡Hola!..." })</script>
export function montarChat({ slug, nombre, color, saludo, texto = "#ffffff", icono = "💬" }) {
  const estilo = document.createElement("style");
  estilo.textContent = `
  .ia-lanzador{position:fixed;right:20px;bottom:20px;z-index:60;display:flex;align-items:center;gap:10px;border:0;cursor:pointer;
    background:${color};color:${texto};font:600 15px/1 system-ui,sans-serif;padding:14px 18px;border-radius:999px;
    box-shadow:0 12px 30px rgba(0,0,0,.25);transition:transform .2s}
  .ia-lanzador:hover{transform:translateY(-2px)}
  .ia-lanzador .pulso{width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:ia-pulso 1.8s infinite}
  @keyframes ia-pulso{70%{box-shadow:0 0 0 10px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
  .ia-panel{position:fixed;right:20px;bottom:86px;z-index:61;width:min(380px,calc(100vw - 32px));height:min(540px,calc(100vh - 120px));
    display:flex;flex-direction:column;background:#fff;color:#111;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.3);
    font:15px/1.45 system-ui,sans-serif;transform-origin:bottom right;animation:ia-abrir .25s ease}
  .ia-panel[hidden]{display:none}
  @keyframes ia-abrir{from{opacity:0;transform:scale(.9)}}
  .ia-cabeza{background:${color};color:${texto};padding:14px 16px;display:flex;justify-content:space-between;align-items:center}
  .ia-cabeza b{display:block;font-size:16px}.ia-cabeza small{opacity:.85}
  .ia-cabeza button{background:none;border:0;color:inherit;font-size:22px;cursor:pointer}
  .ia-mensajes{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#f4f5f7}
  .ia-m{max-width:85%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}
  .ia-m.bot{background:#fff;align-self:flex-start;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
  .ia-m.yo{background:${color};color:${texto};align-self:flex-end;border-bottom-right-radius:4px}
  .ia-m.escribiendo{opacity:.6;font-style:italic}
  .ia-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb}
  .ia-form input{flex:1;min-width:0;border:1px solid #d1d5db;border-radius:999px;padding:10px 14px;font:inherit}
  .ia-form button{border:0;background:${color};color:${texto};border-radius:999px;padding:0 16px;font:600 14px system-ui;cursor:pointer}
  .ia-nota{font-size:11px;color:#6b7280;text-align:center;padding:0 10px 8px}`;
  document.head.appendChild(estilo);

  const lanzador = document.createElement("button");
  lanzador.className = "ia-lanzador";
  lanzador.innerHTML = `<span class="pulso"></span>${icono} Habla con ${nombre}`;
  const panel = document.createElement("section");
  panel.className = "ia-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", `Chat con ${nombre}`);
  panel.innerHTML = `
    <div class="ia-cabeza"><div><b>${nombre}</b><small>Asistente con IA · responde al instante</small></div>
      <button type="button" aria-label="Cerrar">×</button></div>
    <div class="ia-mensajes" aria-live="polite"></div>
    <form class="ia-form"><input name="t" autocomplete="off" placeholder="Escribe tu mensaje…" maxlength="500" required>
      <button>Enviar</button></form>
    <div class="ia-nota">Demo real con IA · creado por <a href="https://agenttafurt.xyz" target="_blank" rel="noopener">Agencia Tafurtfer</a></div>`;
  document.body.append(lanzador, panel);

  const lista = panel.querySelector(".ia-mensajes");
  const form = panel.querySelector("form");
  let sesion;
  try {
    sesion = sessionStorage.getItem(`ia-${slug}`);
  } catch {}
  if (!sesion) {
    sesion = `web-${crypto.randomUUID()}`;
    try {
      sessionStorage.setItem(`ia-${slug}`, sesion);
    } catch {}
  }
  const agregar = (texto, quien) => {
    const div = document.createElement("div");
    div.className = `ia-m ${quien}`;
    div.textContent = texto.replace(/\*(.+?)\*/g, "$1");
    lista.appendChild(div);
    lista.scrollTop = lista.scrollHeight;
    return div;
  };
  const abrir = () => {
    panel.hidden = false;
    if (!lista.children.length) agregar(saludo, "bot");
    form.t.focus();
  };
  lanzador.onclick = () => (panel.hidden ? abrir() : (panel.hidden = true));
  panel.querySelector(".ia-cabeza button").onclick = () => (panel.hidden = true);
  document.querySelectorAll("[data-abrir-chat]").forEach((b) => b.addEventListener("click", (e) => (e.preventDefault(), abrir())));

  form.onsubmit = async (e) => {
    e.preventDefault();
    const texto = form.t.value.trim();
    if (!texto) return;
    form.t.value = "";
    agregar(texto, "yo");
    const espera = agregar(`${nombre} está escribiendo…`, "bot escribiendo");
    try {
      const r = await fetch(`/demo/${slug}/mensaje`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesion, texto }),
      });
      const datos = await r.json();
      espera.remove();
      agregar(datos.respuesta || "Tuve un problema, intenta de nuevo.", "bot");
    } catch {
      espera.remove();
      agregar("No pude conectarme. Intenta de nuevo en un momento.", "bot");
    }
  };
  return { abrir };
}
