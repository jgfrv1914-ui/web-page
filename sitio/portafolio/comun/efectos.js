// Efectos comunes del portafolio: aparición al hacer scroll y contadores animados.
(() => {
  const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const contar = (el) => {
    const fin = Number(el.dataset.contar);
    const decimales = Number(el.dataset.decimales || 0);
    const formato = (n) => n.toLocaleString("es-CO", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    if (reducir) return (el.textContent = formato(fin));
    const inicio = performance.now();
    const paso = (ahora) => {
      const t = Math.min((ahora - inicio) / 1600, 1);
      el.textContent = formato(fin * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("visto");
        e.target.querySelectorAll("[data-contar]").forEach(contar);
        observador.unobserve(e.target);
      }
    },
    { threshold: 0.15 },
  );
  document.querySelectorAll(".revelar").forEach((el) => observador.observe(el));
})();
