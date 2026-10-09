// Versión para visitantes de fuera de Colombia (se abre con ?ext desde /web-con-ia/):
// cambia los textos de la oferta de la agencia a los paquetes en dólares y quita lo que solo aplica en Colombia.
(function () {
  if (!/[?&]ext(=|&|$)/.test(location.search)) return;
  document.querySelectorAll("[data-ext]").forEach(function (e) { e.innerHTML = e.getAttribute("data-ext"); });
  document.querySelectorAll("[data-solo-co]").forEach(function (e) { e.remove(); });
})();
