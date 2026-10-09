// Personajes 3D articulados (hombro, codo, muñeca) con estados de ánimo que reaccionan al visitante.
// Uso: import { montarAnimado } from "/portafolio/comun/animados.js";
//      montarAnimado(document.querySelector("#escena"), { tipo: "robot" | "doctora" | "barbero" | "diente" | "fisio" | "pizza", colores, globo, frases });
// Estados: REPOSO, MIRANDO, SALUDANDO, PENSANDO, HABLANDO, FELIZ, BAILANDO y uno propio de cada personaje
// (ANOTANDO, CORTANDO, CEPILLANDO, ESTIRANDO, LANZANDO). Se muestran con una etiqueta tipo "SALUDANDO_".
import * as THREE from "./three.module.min.js";
import { RoomEnvironment } from "./RoomEnvironment.js";
import { RoundedBoxGeometry } from "./RoundedBoxGeometry.js";

const suave = (a, b, t) => a + (b - a) * t;
const caja = (an, al, pr, r = 0.12) => new RoundedBoxGeometry(an, al, pr, 5, r);
const PISO = -1.35;

function pieza(geometria, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometria, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function esfera(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = pieza(new THREE.SphereGeometry(r, 40, 32), mat, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
/** Casquete de esfera (pelo, gorro, barba). */
function casquete(r, mat, y, { phi = 0, phiLargo = Math.PI * 2, theta = 0, thetaLargo = Math.PI / 2, escala = [1, 1, 1], z = 0 } = {}) {
  const m = pieza(new THREE.SphereGeometry(r, 48, 32, phi, phiLargo, theta, thetaLargo), mat, 0, y, z);
  m.scale.set(...escala);
  return m;
}
// Material tipo "juguete de vinilo": suave, con un poco de brillo
const vinilo = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color("#ffffff"), ...extra });
const cabello = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 });
const tela = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.85, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).offsetHSL(0, 0, 0.15) });
const brillante = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
const luz = (color, intensidad = 0.75) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensidad, roughness: 0.3 });
const metal = (color) => new THREE.MeshStandardMaterial({ color, metalness: 0.95, roughness: 0.18 });

/** Brazo con hombro, codo y muñeca. La mano va en `muneca`. `lado` = 1 a la derecha de la pantalla, -1 a la izquierda. */
function brazo({ articulacion, superior, antebrazo, grosor = 0.1 }, lado) {
  const hombro = new THREE.Group();
  if (articulacion) hombro.add(pieza(new THREE.SphereGeometry(grosor * 1.9, 32, 32), articulacion));
  hombro.add(pieza(new THREE.CapsuleGeometry(grosor, 0.36, 8, 20), superior, 0, -0.26, 0));
  const codo = new THREE.Group();
  codo.position.y = -0.5;
  codo.add(pieza(new THREE.SphereGeometry(grosor * (articulacion ? 1.3 : 1.02), 24, 24), articulacion || superior));
  codo.add(pieza(new THREE.CapsuleGeometry(grosor * 0.92, 0.3, 8, 20), antebrazo, 0, -0.22, 0));
  const muneca = new THREE.Group();
  muneca.position.y = -0.44;
  codo.add(muneca);
  hombro.add(codo);
  return { hombro, codo, muneca, dedos: [], lado };
}

/** Mano redondeada con pulgar (personajes humanos). */
function mano(piel, lado) {
  const g = new THREE.Group();
  g.add(esfera(0.11, piel, 0, -0.07, 0, 0.95, 1.1, 0.8));
  const pulgar = pieza(new THREE.CapsuleGeometry(0.035, 0.07, 6, 12), piel, -0.085 * lado, -0.04, 0.04);
  pulgar.rotation.z = 0.7 * lado;
  g.add(pulgar);
  return g;
}

/** Cara con ojos brillantes que parpadean, cejas, mejillas y boca. */
function cara(cabeza, { piel, cejas, y = 0.5, z = 0.53, separacion = 0.21, boca = "#8c3a3a" }) {
  const negro = brillante("#1a1414");
  const blanco = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const ojos = [];
  for (const lado of [-1, 1]) {
    const ojo = new THREE.Group();
    ojo.position.set(separacion * lado, y, z);
    ojo.userData = { x: separacion * lado, y };
    ojo.add(esfera(0.085, negro, 0, 0, 0, 1, 1.28, 0.55));
    ojo.add(esfera(0.028, blanco, 0.028, 0.045, 0.045));
    ojo.add(esfera(0.013, blanco, -0.025, -0.035, 0.045));
    cabeza.add(ojo);
    ojos.push(ojo);
    if (cejas) {
      const ceja = pieza(new THREE.CapsuleGeometry(0.022, 0.1, 6, 12), cejas, separacion * lado, y + 0.17, z - 0.02);
      ceja.rotation.z = Math.PI / 2 - 0.15 * lado;
      cabeza.add(ceja);
    }
    cabeza.add(esfera(0.075, new THREE.MeshStandardMaterial({ color: "#ff8f8f", transparent: true, opacity: 0.45, roughness: 1 }), (separacion + 0.14) * lado, y - 0.14, z - 0.06, 1.2, 0.8, 0.4));
  }
  const labio = pieza(new THREE.TorusGeometry(0.075, 0.022, 12, 32, Math.PI), new THREE.MeshStandardMaterial({ color: boca, roughness: 0.5 }), 0, y - 0.19, z + 0.005);
  labio.rotation.z = Math.PI;
  cabeza.add(labio);
  if (piel) cabeza.add(esfera(0.045, piel, 0, y - 0.07, z + 0.04, 1, 0.9, 0.8));
  return { ojos, boca: labio };
}

/** Base humana estilo chibi: cabeza grande, cuerpo pequeño, piernas cortas. */
function humano(c, { bata = false } = {}) {
  const piel = vinilo(c.piel, { roughness: 0.6, sheen: 0.15 });
  const raiz = new THREE.Group();
  // Piernas y zapatos
  for (const lado of [-1, 1]) {
    raiz.add(pieza(new THREE.CapsuleGeometry(0.105, 0.28, 8, 20), tela(c.pantalon), 0.16 * lado, -1.02, 0));
    raiz.add(esfera(0.13, brillante(c.zapatos), 0.16 * lado, -1.28, 0.05, 1, 0.62, 1.45));
  }
  // Torso (camisa) y, encima, la prenda principal
  const torso = new THREE.Group();
  const camisa = pieza(new THREE.CapsuleGeometry(0.36, 0.38, 12, 32), tela(c.camisa), 0, -0.38, 0);
  camisa.scale.z = 0.82;
  torso.add(camisa);
  if (bata) {
    const abrigo = pieza(new THREE.CylinderGeometry(0.37, 0.5, 0.95, 40, 1, true, 0.42, Math.PI * 2 - 0.84), tela(c.ropa), 0, -0.46, 0);
    abrigo.material.side = THREE.DoubleSide;
    abrigo.scale.z = 0.86;
    torso.add(abrigo);
    torso.add(esfera(0.37, tela(c.ropa), 0, -0.02, 0, 1, 0.55, 0.86));
  }
  raiz.add(torso);
  // Cuello y cabeza
  raiz.add(pieza(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 20), piel, 0, 0.08, 0));
  const cabeza = new THREE.Group();
  cabeza.position.y = 0.14;
  cabeza.add(esfera(0.6, piel, 0, 0.5, 0, 1, 0.94, 0.92));
  for (const lado of [-1, 1]) cabeza.add(esfera(0.11, piel, 0.58 * lado, 0.47, -0.02, 0.6, 1, 0.8));
  const rostro = cara(cabeza, { piel, cejas: cabello(c.pelo) });
  raiz.add(cabeza);
  // Brazos con mano
  const manga = tela(c.manga || c.ropa);
  const brazos = [1, -1].map((lado) => {
    const b = brazo({ superior: manga, antebrazo: manga, grosor: 0.095 }, lado);
    b.hombro.position.set(0.43 * lado, -0.02, 0);
    b.muneca.add(pieza(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 20), manga, 0, 0.02, 0));
    b.muneca.add(mano(piel, lado));
    raiz.add(b.hombro);
    return b;
  });
  return { raiz, cabeza, torso, ojos: rostro.ojos, boca: rostro.boca, brazos };
}

// ---------------- Personajes ----------------

function robot(c) {
  const carcasa = new THREE.MeshPhysicalMaterial({ color: c.cuerpo, roughness: 0.32, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.18 });
  const articulacion = new THREE.MeshPhysicalMaterial({ color: c.articulacion, roughness: 0.4, metalness: 0.4, clearcoat: 0.6 });
  const vidrio = new THREE.MeshPhysicalMaterial({ color: c.visor, roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });
  const ojoLuz = luz(c.ojos), pecho = luz(c.ojos, 0.65);
  const raiz = new THREE.Group();
  const torso = new THREE.Group();
  torso.add(pieza(caja(1.25, 1.35, 0.9, 0.22), carcasa));
  torso.add(pieza(caja(0.95, 0.5, 0.05, 0.05), vidrio, 0, 0.3, 0.45));
  const nucleo = new THREE.Group();
  nucleo.position.set(0, -0.2, 0.46);
  nucleo.add(pieza(new THREE.TorusGeometry(0.22, 0.06, 20, 48), pecho));
  nucleo.add(pieza(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 40), vidrio).rotateX(Math.PI / 2));
  nucleo.add(pieza(new THREE.SphereGeometry(0.09, 24, 24), pecho, 0, 0, 0.02));
  torso.add(nucleo);
  raiz.add(torso);
  raiz.add(pieza(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 24), articulacion, 0, 0.77, 0));
  const cabeza = new THREE.Group();
  cabeza.position.y = 0.87;
  cabeza.add(pieza(caja(1.1, 0.9, 0.85, 0.2), carcasa, 0, 0.45, 0));
  cabeza.add(pieza(caja(0.88, 0.42, 0.06, 0.1), vidrio, 0, 0.5, 0.42));
  const ojos = [];
  for (const lado of [-1, 1]) {
    const ojo = pieza(caja(0.26, 0.15, 0.04, 0.07), ojoLuz, 0.2 * lado, 0.5, 0.46);
    ojo.userData = { x: 0.2 * lado, y: 0.5 };
    cabeza.add(ojo);
    ojos.push(ojo);
    const oreja = pieza(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 32), luz(c.orejas, 0.5), 0.58 * lado, 0.45, 0);
    oreja.rotation.z = Math.PI / 2;
    cabeza.add(oreja);
  }
  cabeza.add(pieza(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8), articulacion, 0.25, 1.08, 0));
  cabeza.add(pieza(new THREE.SphereGeometry(0.055, 20, 20), luz(c.antena, 1), 0.25, 1.3, 0));
  raiz.add(cabeza);
  const brazos = [1, -1].map((lado) => {
    const b = brazo({ articulacion: carcasa, superior: articulacion, antebrazo: articulacion, grosor: 0.1 }, lado);
    b.hombro.position.set(0.8 * lado, 0.42, 0);
    b.muneca.add(pieza(caja(0.2, 0.14, 0.12, 0.05), carcasa, 0, -0.04, 0));
    for (let i = 0; i < 4; i++) {
      const dedo = new THREE.Group();
      dedo.position.set(-0.075 + i * 0.05, -0.1, 0);
      dedo.add(pieza(new THREE.CapsuleGeometry(0.018, 0.14, 4, 8), articulacion, 0, -0.08, 0));
      b.muneca.add(dedo);
      b.dedos.push(dedo);
    }
    raiz.add(b.hombro);
    return b;
  });
  return { raiz, cabeza, torso, ojos, brazos, pulso: nucleo, flota: true };
}

function doctora(c) {
  const p = humano(c, { bata: true });
  const { cabeza, raiz } = p;
  // Estetoscopio, bolsillo y pluma
  const goma = brillante(c.detalle);
  const cuello = pieza(new THREE.TorusGeometry(0.2, 0.028, 12, 48, Math.PI * 1.15), goma, 0, 0.02, 0.1);
  cuello.rotation.set(Math.PI / 2.3, 0, Math.PI * 1.07);
  raiz.add(cuello);
  for (const lado of [-1, 1]) {
    const t = pieza(new THREE.CapsuleGeometry(0.024, 0.34, 6, 12), goma, 0.1 * lado, -0.2, 0.33);
    t.rotation.z = 0.12 * lado;
    raiz.add(t);
  }
  raiz.add(pieza(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 28), metal("#d7dce2"), 0.02, -0.43, 0.36).rotateX(Math.PI / 2));
  raiz.add(pieza(caja(0.16, 0.12, 0.02, 0.02), tela("#e9e9e4"), -0.24, -0.5, 0.4));
  raiz.add(pieza(new THREE.CapsuleGeometry(0.012, 0.08, 4, 8), brillante(c.acento), -0.21, -0.44, 0.42));
  // Pelo con moño y flequillo
  const pelo = cabello(c.pelo);
  const tapa = casquete(0.64, pelo, 0.5, { thetaLargo: Math.PI * 0.5, escala: [1.02, 1, 0.98], z: -0.02 });
  tapa.rotation.x = -0.55;
  cabeza.add(tapa);
  cabeza.add(esfera(0.56, pelo, 0, 0.42, -0.2, 1.08, 1, 0.78));
  cabeza.add(esfera(0.25, pelo, 0, 1.08, -0.3));
  cabeza.add(pieza(new THREE.TorusGeometry(0.2, 0.05, 12, 32), vinilo(c.acento), 0, 0.97, -0.26).rotateX(Math.PI / 2.4));
  for (const [x, y, r, g] of [[-0.3, 0.9, 0.2, 0.5], [-0.06, 0.95, 0.19, 0.2], [0.24, 0.9, 0.2, -0.4]]) {
    const mecha = esfera(r, pelo, x, y, 0.33, 1.35, 0.5, 0.75);
    mecha.rotation.z = g;
    cabeza.add(mecha);
  }
  // Gafas redondas
  const montura = brillante(c.gafas || "#2b2730");
  for (const lado of [-1, 1]) cabeza.add(pieza(new THREE.TorusGeometry(0.135, 0.018, 12, 40), montura, 0.21 * lado, 0.5, 0.57));
  cabeza.add(pieza(new THREE.CapsuleGeometry(0.014, 0.07, 4, 8), montura, 0, 0.53, 0.6).rotateZ(Math.PI / 2));
  // Portapapeles en la mano izquierda
  const tabla = new THREE.Group();
  tabla.add(pieza(caja(0.34, 0.44, 0.03, 0.02), vinilo("#b58456")));
  tabla.add(pieza(caja(0.28, 0.36, 0.01, 0.01), vinilo("#ffffff"), 0, -0.02, 0.02));
  for (let i = 0; i < 4; i++) tabla.add(pieza(new THREE.BoxGeometry(0.2 - (i % 2) * 0.06, 0.012, 0.005), new THREE.MeshBasicMaterial({ color: "#9aa5b1" }), -0.02, 0.08 - i * 0.06, 0.03));
  tabla.add(pieza(caja(0.1, 0.05, 0.04, 0.015), metal("#cfd5db"), 0, 0.22, 0.02));
  tabla.position.set(0.02, -0.2, 0.1);
  tabla.rotation.x = -0.2;
  p.brazos[1].muneca.add(tabla);
  // Pluma en la mano derecha
  const pluma = pieza(new THREE.CapsuleGeometry(0.018, 0.2, 6, 12), brillante(c.acento), 0.02, -0.14, 0.06);
  pluma.rotation.x = 1.2;
  p.brazos[0].muneca.add(pluma);
  p.especial = {
    nombre: "ANOTANDO",
    poses: (s, t) => s === -1
      ? { hz: 0.1, hx: -0.75, cz: 0.9, cx: -0.9 }
      : { hz: -0.25, hx: -0.8, cz: -0.35 + Math.sin(t * 9) * 0.08, cx: -1.1 + Math.sin(t * 6) * 0.08 },
    cabeza: { x: 0.28, z: 0.06 },
  };
  p.manoPensar = 1;
  return p;
}

function barbero(c) {
  const p = humano(c);
  const { cabeza, raiz } = p;
  // Delantal con tirantes, moño y bolsillo con peine
  const delantal = pieza(new THREE.CylinderGeometry(0.39, 0.46, 0.72, 40, 1, true, -1.15, 2.3), tela(c.ropa), 0, -0.5, 0.01);
  delantal.material.side = THREE.DoubleSide;
  delantal.scale.z = 0.86;
  raiz.add(delantal);
  const dorado = vinilo(c.detalle, { metalness: 0.45, roughness: 0.3 });
  for (const lado of [-1, 1]) {
    const tirante = pieza(new THREE.CapsuleGeometry(0.03, 0.34, 6, 12), dorado, 0.17 * lado, -0.06, 0.28);
    tirante.rotation.z = -0.25 * lado;
    tirante.rotation.x = -0.35;
    raiz.add(tirante);
  }
  const mono = new THREE.Group();
  mono.position.set(0, 0, 0.3);
  for (const lado of [-1, 1]) mono.add(esfera(0.07, dorado, 0.07 * lado, 0, 0, 1.2, 0.8, 0.5));
  mono.add(esfera(0.035, dorado, 0, 0, 0.02));
  raiz.add(mono);
  raiz.add(pieza(caja(0.2, 0.14, 0.02, 0.02), tela(c.ropa), 0.12, -0.55, 0.4));
  // Pelo con copete, barba y bigote
  const pelo = cabello(c.pelo);
  const tapa = casquete(0.64, pelo, 0.5, { thetaLargo: Math.PI * 0.5, z: -0.02 });
  tapa.rotation.x = -0.6;
  cabeza.add(tapa);
  cabeza.add(esfera(0.56, pelo, 0, 0.45, -0.2, 1.08, 0.95, 0.78));
  const copete = esfera(0.3, pelo, 0.05, 0.98, 0.2, 1.6, 0.75, 1.1);
  copete.rotation.z = -0.15;
  cabeza.add(copete);
  cabeza.add(casquete(0.6, pelo, 0.5, { phi: Math.PI * 0.05, phiLargo: Math.PI * 0.9, theta: Math.PI * 0.69, thetaLargo: Math.PI * 0.22, escala: [1.02, 0.96, 0.95], z: 0.01 }));
  for (const lado of [-1, 1]) cabeza.add(esfera(0.1, pelo, 0.53 * lado, 0.48, 0.1, 0.45, 1.4, 0.8));
  for (const lado of [-1, 1]) {
    const bigote = esfera(0.075, pelo, 0.07 * lado, 0.38, 0.55, 1.4, 0.55, 0.6);
    bigote.rotation.z = 0.25 * lado;
    cabeza.add(bigote);
  }
  // Tijeras en la mano derecha (sus hojas se abren y cierran)
  const tijeras = new THREE.Group();
  const hojas = [];
  for (const lado of [-1, 1]) {
    const hoja = new THREE.Group();
    hoja.add(pieza(caja(0.035, 0.3, 0.012, 0.006), metal("#e3e7ec"), 0, 0.15, 0));
    hoja.add(pieza(new THREE.TorusGeometry(0.045, 0.014, 10, 24), dorado, 0.04 * lado, -0.06, 0));
    hoja.rotation.z = 0.12 * lado;
    tijeras.add(hoja);
    hojas.push({ hoja, lado });
  }
  tijeras.position.set(0, -0.16, 0.08);
  tijeras.rotation.x = -0.3;
  p.brazos[0].muneca.add(tijeras);
  // Peine en la izquierda
  const peine = new THREE.Group();
  const negro = brillante("#20201f");
  peine.add(pieza(caja(0.26, 0.05, 0.015, 0.01), negro));
  for (let i = 0; i < 9; i++) peine.add(pieza(new THREE.BoxGeometry(0.01, 0.06, 0.01), negro, -0.11 + i * 0.027, -0.05, 0));
  peine.position.set(0, -0.16, 0.06);
  peine.rotation.z = Math.PI / 2;
  p.brazos[1].muneca.add(peine);
  p.animar = (t, estado) => {
    const cortando = estado === "CORTANDO";
    for (const { hoja, lado } of hojas) hoja.rotation.z = lado * (0.05 + Math.abs(Math.sin(t * (cortando ? 14 : 3))) * (cortando ? 0.38 : 0.08));
  };
  p.especial = {
    nombre: "CORTANDO",
    poses: (s, t) => s === 1
      ? { hz: 0.45 + Math.sin(t * 2) * 0.1, hx: -1.25, cz: -0.5, cx: -0.5 + Math.sin(t * 3) * 0.1 }
      : { hz: -0.4, hx: -1.1, cz: 0.4, cx: -0.7 + Math.sin(t * 4) * 0.12 },
    cabeza: { x: 0.12, z: -0.08 },
  };
  return p;
}

function diente(c) {
  const esmalte = new THREE.MeshPhysicalMaterial({ color: "#fbfdff", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.3 });
  const raiz = new THREE.Group();
  // Cuerpo: corona redondeada con dos raíces que hacen de piernas
  const torso = new THREE.Group();
  torso.add(esfera(0.86, esmalte, 0, 0.3, 0, 1.08, 0.92, 0.86));
  torso.add(esfera(0.6, esmalte, 0, -0.32, 0, 1.12, 0.9, 0.9));
  for (const lado of [-1, 1]) torso.add(esfera(0.4, esmalte, 0.5 * lado, 0.86, 0, 1, 0.95, 0.9));
  for (const lado of [-1, 1]) {
    const raizDiente = pieza(new THREE.CapsuleGeometry(0.23, 0.42, 12, 24), esmalte, 0.3 * lado, -0.75, 0);
    raizDiente.rotation.z = 0.12 * lado;
    torso.add(raizDiente);
    torso.add(esfera(0.16, brillante(c.ropa), 0.34 * lado, -1.24, 0.07, 1.1, 0.6, 1.4));
  }
  raiz.add(torso);
  // Cara (la cabeza es la propia corona) con gorro quirúrgico
  const cabeza = new THREE.Group();
  cabeza.position.y = -0.2;
  const rostro = cara(cabeza, { y: 0.52, z: 0.72, separacion: 0.24, boca: "#c2455a" });
  const gorro = vinilo(c.acento, { roughness: 0.7, clearcoat: 0 });
  cabeza.add(esfera(0.46, gorro, 0, 1.46, -0.02, 1.15, 0.72, 1.05));
  const banda = pieza(new THREE.TorusGeometry(0.5, 0.055, 16, 64), gorro, 0, 1.33, -0.02);
  banda.rotation.x = Math.PI / 2;
  banda.scale.set(1.04, 0.95, 1);
  cabeza.add(banda);
  raiz.add(cabeza);
  // Moño en el "pecho"
  const mono = new THREE.Group();
  mono.position.set(0, -0.36, 0.72);
  const cinta = brillante(c.ropa);
  for (const lado of [-1, 1]) mono.add(esfera(0.1, cinta, 0.09 * lado, 0, 0, 1.25, 0.8, 0.5));
  mono.add(esfera(0.045, cinta, 0, 0, 0.03));
  raiz.add(mono);
  // Destellos de limpieza
  const brilloMat = luz(c.detalle, 0.9);
  const destellos = [[0.95, 1.2], [-1.05, 0.7]].map(([x, y]) => {
    const d = pieza(new THREE.OctahedronGeometry(0.08), brilloMat, x, y, 0.2);
    raiz.add(d);
    return d;
  });
  // Bracitos blancos y cepillo de dientes
  const brazos = [1, -1].map((lado) => {
    const b = brazo({ superior: esmalte, antebrazo: esmalte, grosor: 0.1 }, lado);
    b.hombro.position.set(0.86 * lado, -0.1, 0);
    b.hombro.scale.setScalar(0.85);
    b.muneca.add(esfera(0.13, esmalte, 0, -0.07, 0));
    raiz.add(b.hombro);
    return b;
  });
  const cepillo = new THREE.Group();
  cepillo.add(pieza(new THREE.CapsuleGeometry(0.035, 0.55, 6, 12), brillante(c.detalle)));
  cepillo.add(pieza(caja(0.09, 0.14, 0.12, 0.02), vinilo("#ffffff"), 0, 0.38, 0.06));
  cepillo.add(pieza(caja(0.07, 0.12, 0.05, 0.015), vinilo(c.acento), 0, 0.38, 0.14));
  cepillo.position.set(0, -0.12, 0.08);
  cepillo.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  brazos[0].muneca.add(cepillo);
  const p = { raiz, cabeza, torso, ojos: rostro.ojos, boca: rostro.boca, brazos, giroCabeza: 0.25 };
  p.animar = (t) => destellos.forEach((d, i) => {
    const e = 0.8 + Math.abs(Math.sin(t * 2.5 + i)) * 0.5;
    d.rotation.y = t * 2 + i;
    d.scale.set(e, e * 1.8, e);
  });
  p.especial = {
    nombre: "CEPILLANDO",
    poses: (s, t) => s === 1
      ? { hz: -0.6 + Math.sin(t * 16) * 0.1, hx: -1.8, cz: 0.4, cx: Math.sin(t * 16) * 0.06 }
      : { hz: -0.5, hx: 0, cz: -0.2, cx: -0.4 },
    cabeza: { x: 0, z: 0 },
  };
  return p;
}

function fisio(c) {
  const p = humano(c);
  const { cabeza, raiz, torso } = p;
  // Polo deportivo con cuello, logo en el pecho y franjas en las mangas
  const cuelloPolo = pieza(new THREE.TorusGeometry(0.17, 0.045, 12, 40), tela(c.detalle), 0, 0.02, 0.02);
  cuelloPolo.rotation.x = Math.PI / 2.2;
  torso.add(cuelloPolo);
  torso.add(pieza(caja(0.13, 0.13, 0.03, 0.035), vinilo(c.acento), 0.17, -0.3, 0.3));
  torso.add(pieza(new THREE.CapsuleGeometry(0.018, 0.07, 4, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" }), 0.17, -0.3, 0.32).rotateZ(0.6));
  for (const b of p.brazos) b.hombro.add(pieza(new THREE.TorusGeometry(0.098, 0.018, 8, 28), vinilo(c.acento), 0, -0.44, 0).rotateX(Math.PI / 2));
  // Silbato con cordón
  const cordon = pieza(new THREE.TorusGeometry(0.22, 0.014, 8, 48, Math.PI * 1.1), vinilo(c.acento), 0, -0.02, 0.1);
  cordon.rotation.set(Math.PI / 2.25, 0, Math.PI * 1.05);
  raiz.add(cordon);
  raiz.add(pieza(caja(0.1, 0.06, 0.06, 0.02), metal("#d7dce2"), -0.02, -0.3, 0.34));
  // Pelo con cola de caballo y balaca deportiva
  const pelo = cabello(c.pelo);
  const tapa = casquete(0.64, pelo, 0.5, { thetaLargo: Math.PI * 0.5, escala: [1.02, 1, 0.98], z: -0.02 });
  tapa.rotation.x = -0.5;
  cabeza.add(tapa);
  cabeza.add(esfera(0.56, pelo, 0, 0.44, -0.2, 1.08, 1, 0.78));
  const cola = new THREE.Group();
  cola.position.set(0, 0.95, -0.42);
  cola.add(esfera(0.1, vinilo(c.acento), 0, 0, 0));
  const mechon = pieza(new THREE.CapsuleGeometry(0.13, 0.42, 10, 20), pelo, 0, -0.3, -0.08);
  mechon.rotation.x = 0.35;
  cola.add(mechon);
  cabeza.add(cola);
  const balaca = pieza(new THREE.TorusGeometry(0.585, 0.045, 12, 64), tela(c.acento), 0, 0.8, -0.04);
  balaca.rotation.x = Math.PI / 2 - 0.22;
  balaca.scale.set(1, 0.98, 1);
  cabeza.add(balaca);
  for (const [x, y, r, g] of [[-0.28, 0.88, 0.19, 0.5], [0.05, 0.93, 0.18, 0.1], [0.3, 0.87, 0.17, -0.45]]) {
    const m = esfera(r, pelo, x, y, 0.34, 1.3, 0.45, 0.72);
    m.rotation.z = g;
    cabeza.add(m);
  }
  // ESTIRANDO: brazos arriba y se inclina a un lado y al otro, como en la rutina de pausas activas
  p.especial = {
    nombre: "ESTIRANDO",
    poses: (s) => ({ hz: 2.9 * s, hx: 0, cz: 0.55 * s, cx: 0, dedos: 0 }),
    cabeza: { x: -0.05, z: 0 },
  };
  let inclinacion = 0;
  p.animar = (t, estado) => {
    inclinacion = suave(inclinacion, estado === "ESTIRANDO" ? Math.sin(t * 2.2) * 0.24 : 0, 0.08);
    raiz.rotation.z = inclinacion;
    cola.rotation.x = Math.sin(t * 3.1) * 0.12 + (estado === "FELIZ" || estado === "BAILANDO" ? Math.sin(t * 9) * 0.25 : 0);
    cola.rotation.z = Math.sin(t * 2.3) * 0.1 - inclinacion * 1.4;
  };
  return p;
}

function pizza(c) {
  const raiz = new THREE.Group();
  const torso = new THREE.Group();
  // Porción: triángulo redondeado con queso al frente y masa en los lados
  const forma = new THREE.Shape();
  forma.moveTo(-0.98, 0.95);
  forma.lineTo(0.98, 0.95);
  forma.lineTo(0.06, -0.78);
  forma.quadraticCurveTo(0, -0.88, -0.06, -0.78);
  forma.closePath();
  const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 6, curveSegments: 16 });
  geo.translate(0, 0, -0.11);
  const queso = vinilo(c.queso, { roughness: 0.5, clearcoat: 0.4, sheen: 0, envMapIntensity: 0.5 });
  const masa = vinilo(c.masa, { roughness: 0.7, sheen: 0.1, envMapIntensity: 0.6 });
  torso.add(pieza(geo, [queso, masa]));
  // Borde de la masa (corteza) arriba
  const corteza = pieza(new THREE.CapsuleGeometry(0.2, 1.8, 12, 32), vinilo(c.corteza, { roughness: 0.75 }), 0, 1.02, 0);
  corteza.rotation.z = Math.PI / 2;
  corteza.scale.set(1, 1, 1.05);
  torso.add(corteza);
  // Salsa que asoma bajo el queso, pepperoni y albahaca
  const salsa = vinilo(c.salsa, { sheen: 0, envMapIntensity: 0.5 });
  for (const [x, y] of [[-0.62, 0.72], [0.1, 0.78], [0.66, 0.7]]) torso.add(esfera(0.13, salsa, x, y, 0.13, 1.4, 0.55, 0.3));
  const pepperoni = vinilo(c.pepperoni, { roughness: 0.45, clearcoat: 0.6, sheen: 0, envMapIntensity: 0.5 });
  for (const [x, y, r] of [[-0.4, -0.08, 0.13], [0.38, -0.1, 0.12], [0.02, -0.42, 0.1], [-0.62, 0.52, 0.09], [0.62, 0.5, 0.09]]) {
    torso.add(pieza(new THREE.CylinderGeometry(r, r, 0.05, 28), pepperoni, x, y, 0.2).rotateX(Math.PI / 2));
  }
  const hoja = vinilo(c.albahaca, { sheen: 0, envMapIntensity: 0.5 });
  for (const [x, y, g] of [[-0.2, -0.22, 0.6], [0.2, 0.52, -0.5], [0.24, -0.28, -0.3]]) {
    const h = esfera(0.07, hoja, x, y, 0.2, 1.7, 0.9, 0.3);
    h.rotation.z = g;
    torso.add(h);
  }
  raiz.add(torso);
  // Piernas cortas con zapatos
  for (const lado of [-1, 1]) {
    raiz.add(pieza(new THREE.CapsuleGeometry(0.08, 0.3, 8, 16), masa, 0.2 * lado, -1.02, 0));
    raiz.add(esfera(0.13, brillante(c.zapatos), 0.2 * lado, -1.28, 0.05, 1, 0.62, 1.45));
  }
  // Cara y gorro de chef
  const cabeza = new THREE.Group();
  const rostro = cara(cabeza, { y: 0.28, z: 0.2, separacion: 0.21, boca: "#7a1e12" });
  const blanco = vinilo("#fbfaf6", { roughness: 0.8, clearcoat: 0 });
  cabeza.add(pieza(new THREE.CylinderGeometry(0.34, 0.36, 0.3, 40), blanco, 0, 1.36, -0.02));
  for (const [x, y, r] of [[-0.24, 1.66, 0.26], [0.24, 1.66, 0.26], [0, 1.78, 0.3]]) cabeza.add(esfera(r, blanco, x, y, -0.02));
  cabeza.add(pieza(new THREE.TorusGeometry(0.355, 0.035, 10, 48), vinilo(c.acento), 0, 1.25, -0.02).rotateX(Math.PI / 2));
  raiz.add(cabeza);
  // Bracitos de masa
  const brazos = [1, -1].map((lado) => {
    const b = brazo({ superior: masa, antebrazo: masa, grosor: 0.085 }, lado);
    b.hombro.position.set(0.66 * lado, 0.3, 0);
    b.hombro.scale.setScalar(0.85);
    b.muneca.add(esfera(0.12, masa, 0, -0.07, 0));
    raiz.add(b.hombro);
    return b;
  });
  // Masa que lanza y hace girar
  const disco = new THREE.Group();
  disco.add(pieza(new THREE.CylinderGeometry(0.34, 0.3, 0.05, 40), masa));
  disco.add(pieza(new THREE.TorusGeometry(0.33, 0.05, 12, 40), vinilo(c.corteza)).rotateX(Math.PI / 2));
  disco.position.set(1.05, 1.6, 0.1);
  disco.scale.setScalar(0.001);
  raiz.add(disco);
  const p = { raiz, cabeza, torso, ojos: rostro.ojos, boca: rostro.boca, brazos, giroCabeza: 0.2 };
  p.especial = {
    nombre: "LANZANDO",
    poses: (s, t) => s === 1
      ? { hz: 2.5 + Math.sin(t * 8) * 0.12, hx: 0, cz: 0.3, cx: 0, dedos: 0 }
      : { hz: -0.5, hx: 0.1, cz: -1.3, cx: -0.3 },
    cabeza: { x: -0.12, z: 0.06 },
  };
  let tam = 0.001;
  p.animar = (t, estado) => {
    const lanza = estado === "LANZANDO";
    tam = suave(tam, lanza ? 1 : 0.001, 0.12);
    disco.scale.setScalar(tam);
    disco.position.y = 1.6 + Math.abs(Math.sin(t * 4)) * 0.45;
    disco.rotation.y = t * 9;
    disco.rotation.z = Math.sin(t * 4) * 0.2;
  };
  return p;
}

const FABRICAS = { robot, doctora, barbero, diente, fisio, pizza };

// Pose objetivo de cada estado: hz/hx = hombro, cz/cx = codo, dedos. s = lado (1 derecha, -1 izquierda).
const POSES = {
  REPOSO: (s, t) => ({ hz: 0.14 * s + Math.sin(t * 1.4 + s) * 0.04, hx: Math.sin(t * 1.2 + s) * 0.08, cz: 0.1 * s, cx: -0.25, dedos: 0.25 }),
  MIRANDO: (s) => ({ hz: 0.2 * s, hx: -0.15, cz: 0.1 * s, cx: -0.5, dedos: 0.35 }),
  SALUDANDO: (s, t) => s === 1
    ? { hz: 2.55, hx: -0.15, cz: 0.35 + Math.sin(t * 9) * 0.5, cx: 0, dedos: 0 }
    : { hz: -0.14, hx: 0.05, cz: -0.1, cx: -0.3, dedos: 0.3 },
  PENSANDO: (s, t) => s === -1
    ? { hz: -0.15, hx: -1.25, cz: 0.2, cx: -2.2, dedos: 0.9 + Math.sin(t * 5) * 0.2 }
    : { hz: 0.35, hx: -0.4, cz: -0.9, cx: -1.1, dedos: 0.6 },
  HABLANDO: (s, t) => ({ hz: (0.3 + Math.sin(t * 3 + s * 1.7) * 0.12) * s, hx: -0.7 + Math.sin(t * 2.6 + s) * 0.25, cz: 0.2 * s, cx: -0.9 + Math.sin(t * 4 + s) * 0.25, dedos: 0.1 }),
  FELIZ: (s, t) => ({ hz: (2.7 + Math.sin(t * 10) * 0.12) * s, hx: 0, cz: 0.25 * s, cx: 0, dedos: 0 }),
  BAILANDO: (s, t) => ({ hz: (0.9 + Math.sin(t * 6 + (s > 0 ? 0 : Math.PI)) * 0.55) * s, hx: Math.sin(t * 6) * 0.3, cz: (1.1 + Math.sin(t * 6) * 0.4) * s, cx: -0.4, dedos: 0.2 }),
};

/**
 * opciones: { tipo, colores, globo? (elemento para frases), frases? ({ ESTADO: [frases] } o lista), etiqueta? (false para ocultarla) }
 */
export function montarAnimado(contenedor, opciones) {
  const c = {
    cuerpo: "#1c1a4a", articulacion: "#121033", visor: "#07061a", ojos: "#5ef2e8", orejas: "#a78bfa", antena: "#d9f99d", anillo: "#a78bfa",
    piel: "#f3c9a6", pelo: "#5a3524", ropa: "#ffffff", camisa: "#ffffff", pantalon: "#2d3142", zapatos: "#1d1d1f", acento: "#2ecea0", detalle: "#244d54",
    ...opciones.colores,
  };
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const render = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  render.setPixelRatio(Math.min(devicePixelRatio, 2));
  render.outputColorSpace = THREE.SRGBColorSpace;
  render.toneMapping = THREE.ACESFilmicToneMapping;
  render.toneMappingExposure = 1.1;
  render.shadowMap.enabled = true;
  render.shadowMap.type = THREE.PCFSoftShadowMap;
  contenedor.appendChild(render.domElement);
  render.domElement.style.cssText = "width:100%;height:100%;display:block;cursor:pointer;touch-action:pan-y";
  escena.environment = new THREE.PMREMGenerator(render).fromScene(new RoomEnvironment(), 0.04).texture;

  escena.add(new THREE.HemisphereLight("#ffffff", "#5b5670", 0.9));
  const sol = new THREE.DirectionalLight("#fff7ee", 2.4);
  sol.position.set(0.8, 6, 3);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  escena.add(sol);
  const relleno = new THREE.DirectionalLight("#ffffff", 0.7);
  relleno.position.set(-3, 2, 4);
  escena.add(relleno);
  const borde = new THREE.PointLight(c.anillo, 12, 10);
  borde.position.set(-2.5, 2.2, -1.5);
  escena.add(borde);
  const borde2 = new THREE.PointLight(opciones.tipo === "robot" ? c.ojos : c.anillo, 10, 10);
  borde2.position.set(2.5, 0.5, -1.5);
  escena.add(borde2);

  const p = FABRICAS[opciones.tipo || "robot"](c);
  const cuerpo = new THREE.Group();
  cuerpo.add(p.raiz);
  escena.add(cuerpo);

  // Anillo luminoso en el piso y sombra suave
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.035, 16, 128), new THREE.MeshStandardMaterial({ color: c.anillo, emissive: c.anillo, emissiveIntensity: 0.8 }));
  anillo.rotation.x = Math.PI / 2;
  anillo.position.y = PISO;
  escena.add(anillo);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1.05, 64), new THREE.MeshBasicMaterial({ color: c.anillo, transparent: true, opacity: 0.16, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = PISO - 0.01;
  escena.add(halo);
  const piso = new THREE.Mesh(new THREE.CircleGeometry(2, 64), new THREE.ShadowMaterial({ opacity: 0.12 }));
  piso.rotation.x = -Math.PI / 2;
  piso.position.y = PISO - 0.02;
  piso.receiveShadow = true;
  escena.add(piso);

  // Etiqueta de estado estilo terminal
  let etiqueta = null;
  if (opciones.etiqueta !== false) {
    if (!document.getElementById("estilo-animados")) {
      const e = document.createElement("style");
      e.id = "estilo-animados";
      e.textContent = `.estado-personaje{position:absolute;left:14px;bottom:12px;font:500 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;opacity:.55;pointer-events:none}
      .estado-personaje::after{content:"_";animation:estado-cursor 1s steps(1) infinite}@keyframes estado-cursor{50%{opacity:0}}`;
      document.head.appendChild(e);
    }
    if (getComputedStyle(contenedor).position === "static") contenedor.style.position = "relative";
    etiqueta = document.createElement("div");
    etiqueta.className = "estado-personaje";
    etiqueta.setAttribute("aria-hidden", "true");
    contenedor.appendChild(etiqueta);
  }

  // Máquina de estados
  const reloj = new THREE.Clock();
  let estado = "REPOSO", hasta = 0, fraseI = 0, ocultar;
  const globo = opciones.globo;
  const frases = opciones.frases || {};
  function poner(nuevo, segundos = 3) {
    estado = nuevo;
    hasta = reloj.elapsedTime + segundos;
    if (etiqueta) etiqueta.textContent = nuevo;
    const lista = Array.isArray(frases) ? (nuevo === "REPOSO" || nuevo === "MIRANDO" ? null : frases) : frases[nuevo];
    if (globo && lista?.length) {
      globo.textContent = lista[fraseI++ % lista.length];
      globo.classList.add("visible", "ver");
      clearTimeout(ocultar);
      ocultar = setTimeout(() => globo.classList.remove("visible", "ver"), Math.max(2400, segundos * 1000));
    }
  }
  const pose = (s, t) => {
    if (p.especial && estado === p.especial.nombre) return p.especial.poses(s, t);
    if (estado === "PENSANDO" && p.manoPensar === 1) {
      const q = POSES.PENSANDO(-s, t);
      return { ...q, hz: -q.hz, cz: -q.cz };
    }
    return POSES[estado](s, t);
  };

  // Interacción: mirar el mouse, clic para reaccionar, chat abierto = hablando
  const mirada = new THREE.Vector2();
  let encima = false, clics = 0, ultimoMovimiento = 0;
  addEventListener("pointermove", (e) => {
    const r = contenedor.getBoundingClientRect();
    mirada.x = THREE.MathUtils.clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2), -1, 1);
    mirada.y = THREE.MathUtils.clamp((e.clientY - (r.top + r.height * 0.3)) / (innerHeight / 2), -1, 1);
    ultimoMovimiento = reloj.elapsedTime;
  });
  render.domElement.addEventListener("pointerenter", () => { encima = true; if (estado === "REPOSO") poner("MIRANDO", 60); });
  render.domElement.addEventListener("pointerleave", () => { encima = false; if (estado === "MIRANDO") poner("REPOSO", 0); });
  const reaccion = ["SALUDANDO", ...(p.especial ? [p.especial.nombre] : []), "FELIZ", "BAILANDO", "PENSANDO"];
  function tocar() { poner(reaccion[clics++ % reaccion.length], 3.2); }
  render.domElement.addEventListener("click", tocar);
  contenedor.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocar(); } });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-abrir-chat], .ia-lanzador")) poner("HABLANDO", 4); });

  function ajustar() {
    const { width, height } = contenedor.getBoundingClientRect();
    render.setSize(width, height, false);
    camara.aspect = width / Math.max(height, 1);
    camara.position.set(0, 0.6, camara.aspect < 0.7 ? 9.4 : 8);
    camara.lookAt(0, 0.3, 0);
    camara.updateProjectionMatrix();
  }
  new ResizeObserver(ajustar).observe(contenedor);

  let visible = true, parpadeo = 2.5, rebote = 0;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(contenedor);
  ajustar();

  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!visible) return;
    const dt = Math.min(reloj.getDelta(), 0.05) || 0.016;
    const t = reloj.elapsedTime;
    const vel = quieto ? 0.25 : 1;

    // Vuelve a reposo y, si nadie interactúa, hace algo por su cuenta
    if (estado !== "REPOSO" && estado !== "MIRANDO" && t > hasta) poner(encima ? "MIRANDO" : "REPOSO", 0);
    if (estado === "REPOSO" && t > hasta + 7 && t - ultimoMovimiento > 3) {
      const ideas = ["PENSANDO", "SALUDANDO", "BAILANDO", ...(p.especial ? [p.especial.nombre, p.especial.nombre] : [])];
      poner(ideas[Math.floor(Math.random() * ideas.length)], 3);
    }

    // Cuerpo: flota (robot) o respira (personas); salta si está feliz y se balancea al bailar
    const baile = estado === "BAILANDO";
    rebote = suave(rebote, estado === "FELIZ" ? Math.abs(Math.sin(t * 7)) * 0.3 : baile ? Math.abs(Math.sin(t * 6)) * 0.08 : 0, 0.2);
    p.raiz.position.y = (p.flota ? Math.sin(t * 1.8 * vel) * 0.07 : 0) + rebote;
    if (!p.flota) p.torso.scale.set(1 + Math.sin(t * 2.2) * 0.01 * vel, 1 + Math.sin(t * 2.2 + 1) * 0.015 * vel, 1);
    cuerpo.rotation.y = suave(cuerpo.rotation.y, mirada.x * 0.35 + (baile ? Math.sin(t * 3) * 0.4 : 0), 0.06);
    cuerpo.rotation.z = suave(cuerpo.rotation.z, baile ? Math.sin(t * 6) * 0.08 : Math.sin(t * 0.9) * 0.015, 0.1);

    // Cabeza: mira al mouse, se inclina al pensar o en su acción propia
    const pensando = estado === "PENSANDO";
    const propia = p.especial && estado === p.especial.nombre ? p.especial.cabeza : null;
    const k = p.giroCabeza ?? 1;
    p.cabeza.rotation.y = suave(p.cabeza.rotation.y, mirada.x * 0.45 * k, 0.08);
    p.cabeza.rotation.x = suave(p.cabeza.rotation.x, (propia ? propia.x : pensando ? -0.18 : mirada.y * 0.25) * k, 0.08);
    p.cabeza.rotation.z = suave(p.cabeza.rotation.z, (propia ? propia.z : pensando ? 0.18 : baile ? Math.sin(t * 6) * 0.12 : 0) * k, 0.08);
    if (k < 1) p.torso.rotation.z = suave(p.torso.rotation.z, pensando ? 0.08 : 0, 0.08);

    // Ojos: parpadean, sonríen (FELIZ), miran arriba (PENSANDO) y siguen el mouse
    parpadeo -= dt;
    const cerrado = parpadeo < 0 && parpadeo > -0.12;
    if (parpadeo < -0.12) parpadeo = 2 + Math.random() * 3;
    for (const ojo of p.ojos) {
      const base = ojo.userData;
      ojo.scale.y = suave(ojo.scale.y, cerrado ? 0.12 : estado === "FELIZ" ? 0.45 : 1, 0.35);
      ojo.position.y = suave(ojo.position.y, base.y + (pensando ? 0.04 : -mirada.y * 0.015), 0.1);
      ojo.position.x = suave(ojo.position.x, base.x + mirada.x * 0.03, 0.2);
    }
    if (p.boca) {
      const abierta = estado === "HABLANDO" ? 1.2 + Math.abs(Math.sin(t * 12)) * 1.2 : estado === "FELIZ" || estado === "SALUDANDO" ? 1.7 : 1;
      p.boca.scale.set(estado === "FELIZ" ? 1.25 : 1, suave(p.boca.scale.y, abierta, 0.3), 1);
    }

    // Brazos: cada articulación se acerca a la pose del estado
    for (const b of p.brazos) {
      const q = pose(b.lado, t * vel);
      b.hombro.rotation.z = suave(b.hombro.rotation.z, q.hz, 0.12);
      b.hombro.rotation.x = suave(b.hombro.rotation.x, q.hx, 0.12);
      b.codo.rotation.z = suave(b.codo.rotation.z, q.cz, 0.15);
      b.codo.rotation.x = suave(b.codo.rotation.x, q.cx, 0.15);
      for (const [i, d] of b.dedos.entries()) d.rotation.x = suave(d.rotation.x, (q.dedos ?? 0.2) + Math.sin(t * 3 + i) * 0.04, 0.2);
    }
    p.animar?.(t, estado);

    // Luces que respiran
    if (p.pulso) p.pulso.scale.setScalar(0.95 + (1 + Math.sin(t * (estado === "HABLANDO" ? 12 : 2.4)) * 0.25) * 0.1);
    anillo.material.emissiveIntensity = 0.8 + Math.sin(t * 2.4) * 0.25 + (estado === "FELIZ" ? 0.5 : 0);
    const escalaAnillo = 1 + Math.sin(t * 1.8) * 0.03 - p.raiz.position.y * 0.1;
    anillo.scale.setScalar(escalaAnillo);
    halo.scale.setScalar(escalaAnillo);

    render.render(escena, camara);
  }
  cuadro();
  setTimeout(() => poner("SALUDANDO", 3), 700);
  return { poner };
}
