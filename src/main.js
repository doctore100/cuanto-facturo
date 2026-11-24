// @ts-check
// Interfaz de «¿Cuánto facturo?»: la variante C, aprobada por David el 24 de noviembre de 2026
// (negocio/cuanto-facturo-diseno.md del centro de control). Lee las preguntas y rellena las cuatro
// tarjetas. Las cuentas están en fiscal/ y los textos en textos.js, los dos con tests; aquí solo
// se pintan.
//
// - Las tarjetas se montan una vez y después solo cambian sus textos. Así un «Ver el detalle»
//   abierto no se cierra al escribir (el prototipo las rehacía enteras con cada tecla).
// - Todo va con textContent: nada de lo que se escribe acaba como HTML.
// - No guarda nada en el navegador (la v0.3 guardaba los datos en localStorage).
import { CLIENTES, SECCIONES_IAE } from './fiscal/index.js';
import { hoyISO, leerImporte } from './format.js';
import { MODOS, textosAlta, opcionesIva, noIncluye, resultado } from './textos.js';

/** @typedef {import('./textos.js').Modo} Modo */

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
/** @param {string} nombre  El valor marcado de un grupo de botones de opción */
const elegido = (nombre) =>
  /** @type {HTMLInputElement} */ (document.querySelector(`input[name="${nombre}"]:checked`)).value;

const formulario = /** @type {HTMLFormElement} */ ($('preguntas'));
const campoImporte = /** @type {HTMLInputElement} */ ($('importe'));
const desplegableIva = /** @type {HTMLSelectElement} */ ($('iva'));
const casilla15 = /** @type {HTMLInputElement} */ ($('casilla15'));

// ── Lo que sale de las reglas, una sola vez ──

$('actividadProfesional').textContent = SECCIONES_IAE[0].etiqueta;
$('actividadEmpresarial').textContent = SECCIONES_IAE[1].etiqueta;
$('noIncluye').textContent = noIncluye();

// Los años de la pregunta del alta salen de la fecha de hoy: en 2027 dirán «Antes de 2025».
const alta = textosAlta(hoyISO());
$('altaAntes').textContent = alta.antes;
$('altaReciente').textContent = alta.reciente;
$('irpfAntes').textContent = alta.irpfAntes;
$('irpfReciente').textContent = alta.irpfReciente;
$('ayudaAlta').textContent = alta.ayuda;
$('textoPrefiero15').textContent = alta.prefiero15;

for (const { texto, valor } of opcionesIva()) desplegableIva.add(new Option(texto, valor));

// ── Las cuatro tarjetas, montadas una vez ──

const plantilla = /** @type {HTMLTemplateElement} */ ($('plantillaTarjeta'));
const tarjetas = CLIENTES.map((cliente) => {
  const tarjeta = /** @type {HTMLElement} */ (
    /** @type {DocumentFragment} */ (plantilla.content.cloneNode(true)).firstElementChild
  );
  /** @param {string} selector */
  const en = (selector) => /** @type {HTMLElement} */ (tarjeta.querySelector(selector));
  tarjeta.dataset.cliente = cliente.id;
  en('h2').textContent = cliente.titulo;
  $('tarjetas').append(tarjeta);
  return {
    cliente,
    grande: en('.grande'),
    filas: [...tarjeta.querySelectorAll('.fila')].map((fila) => /** @type {HTMLElement} */ (fila)),
    redondeo: en('.redondeo'),
    detalle: en('.detalle p'),
  };
});

/**
 * Una línea de la tarjeta: texto, importe y si es lo tuyo (en turquesa).
 * @param {HTMLElement} donde
 * @param {import('./textos.js').Linea} linea
 */
function poner(donde, { texto, importe, tuyo }) {
  /** @type {HTMLElement} */ (donde.children[0]).textContent = texto;
  /** @type {HTMLElement} */ (donde.children[1]).textContent = importe;
  donde.classList.toggle('tuyo', tuyo);
}

// ── Pintar ──

function pintar() {
  const modo = /** @type {Modo} */ (elegido('modo'));
  $('tituloImporte').textContent = MODOS[modo].titulo;
  $('ayudaImporte').textContent = MODOS[modo].ayuda;

  const leido = leerImporte(campoImporte.value);
  // Si lo escrito no es un importe se calcula con 0 y el campo lo dice a quien usa un lector de pantalla.
  campoImporte.toggleAttribute('aria-invalid', leido === null && campoImporte.value.trim() !== '');

  const servicio = elegido('actividad') === 'profesional';
  const reciente = elegido('alta') === 'reciente';
  $('preguntaAlta').hidden = !servicio; // a un negocio no se le retiene
  $('prefiero15').hidden = !(servicio && reciente);

  const r = resultado({
    modo,
    importe: leido ?? 0,
    servicio,
    reciente,
    prefiere15: casilla15.checked,
    tipoIva: Number(desplegableIva.value),
  });
  $('aviso').textContent = r.aviso;
  r.tarjetas.forEach((datos, i) => {
    const t = tarjetas[i];
    poner(t.grande, datos.grande);
    datos.filas.forEach((linea, n) => poner(t.filas[n], linea));
    t.redondeo.textContent = datos.redondeo;
    t.redondeo.hidden = !datos.redondeo;
    t.detalle.textContent = datos.detalle;
  });
}

formulario.addEventListener('input', pintar);
formulario.addEventListener('change', pintar);
// Con Intro en el importe, el formulario se enviaría y la página se recargaría.
formulario.addEventListener('submit', (e) => e.preventDefault());
pintar();
