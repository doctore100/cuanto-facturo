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
import { CLIENTES, SECCIONES_IAE, facturaParaNeto, facturaDesdeBase, facturaDesdePago, retencionSinFecha } from './fiscal/index.js';
import { euros, hoyISO, leerImporte } from './format.js';
import { MODOS, textosAlta, opcionesIva, avisoRetencion, detalle, textoRedondeo, noIncluye } from './textos.js';

/** @typedef {import('./textos.js').Resultado} Resultado */
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
 * @param {[string, string, boolean?]} linea
 */
function poner(donde, [texto, importe, tuyo = false]) {
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
  const importe = leido ?? 0;
  // Si lo escrito no es un importe se calcula con 0 y el campo lo dice a quien usa un lector de pantalla.
  campoImporte.toggleAttribute('aria-invalid', leido === null && campoImporte.value.trim() !== '');

  const servicio = elegido('actividad') === 'profesional';
  const reciente = elegido('alta') === 'reciente';
  const prefiere15 = casilla15.checked;
  $('preguntaAlta').hidden = !servicio; // a un negocio no se le retiene
  $('prefiero15').hidden = !(servicio && reciente);
  $('aviso').textContent = avisoRetencion({ servicio, reciente, prefiere15 });

  const tipoRetencion = retencionSinFecha({
    seccion: servicio ? 'profesional' : 'empresarial',
    altaReciente: reciente,
    preferir15: prefiere15,
  });
  const tipoIva = Number(desplegableIva.value);

  for (const t of tarjetas) {
    const c = { tipoIva, tipoRetencion, llevaIva: t.cliente.llevaIva, llevaRetencion: t.cliente.llevaRetencion };
    /** @type {Resultado} */
    const f = modo === 'precio' ? facturaDesdeBase({ base: importe, ...c })
      : modo === 'pago' ? facturaDesdePago({ pago: importe, ...c })
      : facturaParaNeto({ neto: importe, ...c });

    const precio = /** @type {[string, string]} */ (['Pon de precio (sin IVA)', euros(f.base)]);
    const pago = /** @type {[string, string]} */ (['Tu cliente te pagará', euros(f.total)]);
    const paraTi = /** @type {[string, string, boolean]} */ (['Para ti', euros(f.teQueda), true]);
    const hacienda = /** @type {[string, string]} */ (['Guarda para Hacienda', f.iva ? euros(f.iva) : 'Nada']);
    // Quiero ganar: lo grande es el precio. Al revés: lo grande es lo que te queda.
    const [grande, ...filas] = modo === 'ganar' ? [precio, pago, paraTi, hacienda] : [paraTi, precio, pago, hacienda];
    poner(t.grande, grande);
    filas.forEach((linea, i) => poner(t.filas[i], linea));

    t.redondeo.textContent = textoRedondeo(modo, importe, f);
    t.redondeo.hidden = !t.redondeo.textContent;
    t.detalle.textContent = detalle(t.cliente.id, f);
  }
}

formulario.addEventListener('input', pintar);
formulario.addEventListener('change', pintar);
// Con Intro en el importe, el formulario se enviaría y la página se recargaría.
formulario.addEventListener('submit', (e) => e.preventDefault());
pintar();
