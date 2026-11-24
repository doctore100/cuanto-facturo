// @ts-check
// Interfaz de «¿Cuánto facturo?»: la variante C, aprobada por David el 24 de noviembre de 2026
// (negocio/cuanto-facturo-diseno.md del centro de control). Lee las preguntas y rellena las cuatro
// tarjetas. Las cuentas están en fiscal/, con tests; aquí solo se eligen los textos.
//
// - Las tarjetas se montan una vez y después solo cambian sus textos. Así un «Ver el detalle»
//   abierto no se cierra al escribir (el prototipo las rehacía enteras con cada tecla).
// - Todo va con textContent: nada de lo que se escribe acaba como HTML.
// - No guarda nada en el navegador (la v0.3 guardaba los datos en localStorage).
import {
  CLIENTES, IVA, SECCIONES_IAE, RETENCION, EJERCICIO, redondear,
  facturaParaNeto, facturaDesdeBase, facturaDesdePago, opcionesAlta, retencionSinFecha,
} from './fiscal/index.js';
import { euros, porcentaje, hoyISO, leerImporte } from './format.js';

/** @typedef {import('./fiscal/calculo.js').Factura & { exacto?: boolean }} Resultado */
/** @typedef {'ganar' | 'precio' | 'pago'} Modo */

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
/** @param {string} nombre  El valor marcado de un grupo de botones de opción */
const elegido = (nombre) =>
  /** @type {HTMLInputElement} */ (document.querySelector(`input[name="${nombre}"]:checked`)).value;

const formulario = /** @type {HTMLFormElement} */ ($('preguntas'));
const campoImporte = /** @type {HTMLInputElement} */ ($('importe'));
const desplegableIva = /** @type {HTMLSelectElement} */ ($('iva'));
const casilla15 = /** @type {HTMLInputElement} */ ($('casilla15'));

/** El título y la ayuda del importe cambian con lo que se quiere saber. */
/** @type {Record<Modo, [string, string]>} */
const MODOS = {
  ganar: ['¿Cuánto quieres ganar?', 'Lo que quieres que te quede limpio de esa factura.'],
  precio: ['¿Qué precio vas a poner?', 'Sin IVA, como lo escribes en tu programa de facturación.'],
  pago: ['¿Cuánto te van a pagar?', 'Lo que te llega al banco.'],
};

// ── Lo que sale de las reglas, una sola vez ──

$('actividadProfesional').textContent = SECCIONES_IAE[0].etiqueta;
$('actividadEmpresarial').textContent = SECCIONES_IAE[1].etiqueta;
$('ejercicio').textContent = String(EJERCICIO);

// Los años de la pregunta del alta salen de la fecha de hoy: en 2027 dirán «Antes de 2025».
const { desde, anios } = opcionesAlta(hoyISO());
$('altaAntes').textContent = `Antes de ${desde}, o no lo sé`;
$('altaReciente').textContent = `En ${anios.slice(0, -1).join(', ')} o ${anios.at(-1)}`;
$('irpfAntes').textContent = `IRPF ${porcentaje(RETENCION.general)}`;
$('irpfReciente').textContent = `IRPF ${porcentaje(RETENCION.nuevoAutonomo)}`;

for (const tipo of IVA) {
  const texto = tipo.tipo ? `${tipo.etiqueta} (${porcentaje(tipo.tipo)})` : tipo.etiqueta;
  desplegableIva.add(new Option(texto, String(tipo.tipo)));
}

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

// ── Los textos ──

/** @param {Resultado} f */
function textoIva(f) {
  if (!f.tipoIva) return 'Lo que haces no lleva IVA.';
  return `Tu programa sumará el IVA (${porcentaje(f.tipoIva)}: ${euros(f.iva)}). Guárdalo para Hacienda: no es tuyo.`;
}

/**
 * «Ver el detalle», una frase por tarjeta. Habla de IRPF, como las opciones del alta (David, 24 de
 * noviembre de 2026: «pasa a decir IRPF»).
 * @param {string} cliente
 * @param {Resultado} f
 */
function detalle(cliente, f) {
  switch (cliente) {
    case 'es-b2b':
      return textoIva(f) + (f.tipoRetencion
        ? ` Y restará el IRPF (${porcentaje(f.tipoRetencion)}: ${euros(f.retencion)}): tu cliente se lo paga a Hacienda por ti. No lo pierdes: se descuenta de tu renta.`
        : ' Con un negocio, no se resta IRPF.');
    case 'es-b2c':
      return `${textoIva(f)} A una persona no se le resta IRPF.`;
    case 'ue-b2b':
      return 'Sin IVA: lo paga tu cliente en su país, y tu programa pone la frase que toca. Para hacerlo tienes que estar apuntado para vender a Europa; si no lo sabes, pregunta a tu gestoría.';
    default:
      return 'Sin IVA y sin IRPF: lo que pones es lo que cobras.';
  }
}

/**
 * El aviso de encima de las tarjetas. El lector de pantalla lo lee cuando cambia (role="status").
 * @param {{ servicio: boolean, reciente: boolean, prefiere15: boolean }} d
 */
function aviso({ servicio, reciente, prefiere15 }) {
  const general = porcentaje(RETENCION.general);
  const nuevo = porcentaje(RETENCION.nuevoAutonomo);
  if (!servicio) return 'Con un negocio, en la factura no te quitan nada para Hacienda.';
  if (reciente && prefiere15) return `Has elegido que te quiten un ${general} de IRPF aunque te toque el ${nuevo}.`;
  if (reciente) {
    return `Las empresas de España te quitan un ${nuevo} de IRPF para Hacienda. Dura el año de tu alta y los dos siguientes; después, un ${general}.`;
  }
  return `Las empresas de España te quitan un ${general} de IRPF para Hacienda.`;
}

// ── Pintar ──

function pintar() {
  const modo = /** @type {Modo} */ (elegido('modo'));
  [$('tituloImporte').textContent, $('ayudaImporte').textContent] = MODOS[modo];

  const leido = leerImporte(campoImporte.value);
  const importe = leido ?? 0;
  // Si lo escrito no es un importe se calcula con 0 y el campo lo dice a quien usa un lector de pantalla.
  campoImporte.toggleAttribute('aria-invalid', leido === null && campoImporte.value.trim() !== '');

  const servicio = elegido('actividad') === 'profesional';
  const reciente = elegido('alta') === 'reciente';
  const prefiere15 = casilla15.checked;
  $('preguntaAlta').hidden = !servicio; // a un negocio no se le retiene
  $('prefiero15').hidden = !(servicio && reciente);
  $('aviso').textContent = aviso({ servicio, reciente, prefiere15 });

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

    const inexacto = modo === 'pago' && f.exacto === false;
    t.redondeo.hidden = !inexacto;
    t.redondeo.textContent = inexacto
      ? `Por los céntimos, ${euros(redondear(importe))} no sale exacto: lo más cercano es ${euros(f.total)}.`
      : '';
    t.detalle.textContent = detalle(t.cliente.id, f);
  }
}

formulario.addEventListener('input', pintar);
formulario.addEventListener('change', pintar);
// Con Intro en el importe, el formulario se enviaría y la página se recargaría.
formulario.addEventListener('submit', (e) => e.preventDefault());
pintar();
