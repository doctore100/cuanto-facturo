// @ts-check
/**
 * Los textos de la página que dependen de las cuentas o de las respuestas: el título y la ayuda del
 * importe, las opciones del alta y del IVA, el aviso de la retención, «Ver el detalle», la línea de
 * los céntimos y «Lo que esta cuenta no incluye».
 *
 * Son funciones puras, con tests, para que la página de este proyecto y la de idruiz.com digan lo
 * mismo (guía de instalación del centro de control, paso B0; 24 de noviembre de 2026). Los
 * porcentajes y los años salen de las reglas, no se escriben.
 */
import { RETENCION, IVA, EJERCICIO, redondear, opcionesAlta } from './fiscal/index.js';
import { euros, porcentaje } from './format.js';

/** @typedef {'ganar' | 'precio' | 'pago'} Modo */
/** @typedef {import('./fiscal/calculo.js').Factura & { exacto?: boolean }} Resultado */

/**
 * La pregunta del importe y su ayuda cambian con lo que se quiere saber.
 * @type {Record<Modo, { titulo: string, ayuda: string }>}
 */
export const MODOS = {
  ganar: { titulo: '¿Cuánto quieres ganar?', ayuda: 'Lo que quieres que te quede limpio de esa factura.' },
  precio: { titulo: '¿Qué precio vas a poner?', ayuda: 'Sin IVA, como lo escribes en tu programa de facturación.' },
  pago: { titulo: '¿Cuánto te van a pagar?', ayuda: 'Lo que te llega al banco.' },
};

/**
 * Las dos opciones de «¿Cuándo te diste de alta de autónomo?», su ayuda y la casilla del 15 %. Los
 * años salen de la fecha de hoy: en 2027 dirán «Antes de 2025» y «En 2025, 2026 o 2027».
 * @param {string} fechaISO   La de hoy, yyyy-mm-dd
 */
export function textosAlta(fechaISO) {
  const { desde, anios } = opcionesAlta(fechaISO);
  const general = porcentaje(RETENCION.general);
  const nuevo = porcentaje(RETENCION.nuevoAutonomo);
  return {
    antes: `Antes de ${desde}, o no lo sé`,
    reciente: `En ${anios.slice(0, -1).join(', ')} o ${anios[anios.length - 1]}`,
    irpfAntes: `IRPF ${general}`,
    irpfReciente: `IRPF ${nuevo}`,
    ayuda: `El ${nuevo}, solo si el año antes no trabajabas por tu cuenta.`,
    prefiero15: `Prefiero que me quiten el ${general} aunque me toque el ${nuevo}`,
  };
}

/** Las opciones de «¿Qué IVA lleva lo que haces?», con el porcentaje sacado de las reglas. */
export function opcionesIva() {
  return IVA.map((t) => ({
    texto: t.tipo ? `${t.etiqueta} (${porcentaje(t.tipo)})` : t.etiqueta,
    valor: String(t.tipo),
  }));
}

/**
 * El aviso de encima de las tarjetas. En la página lo lee el lector de pantalla cuando cambia.
 * @param {{ servicio: boolean, reciente: boolean, prefiere15: boolean }} d
 */
export function avisoRetencion({ servicio, reciente, prefiere15 }) {
  const general = porcentaje(RETENCION.general);
  const nuevo = porcentaje(RETENCION.nuevoAutonomo);
  if (!servicio) return 'Con un negocio, en la factura no te quitan nada para Hacienda.';
  if (reciente && prefiere15) return `Has elegido que te quiten un ${general} de IRPF aunque te toque el ${nuevo}.`;
  if (reciente) {
    return `Las empresas de España te quitan un ${nuevo} de IRPF para Hacienda. Dura el año de tu alta y los dos siguientes; después, un ${general}.`;
  }
  return `Las empresas de España te quitan un ${general} de IRPF para Hacienda.`;
}

/** @param {Resultado} f */
function textoIva(f) {
  if (!f.tipoIva) return 'Lo que haces no lleva IVA.';
  return `Tu programa sumará el IVA (${porcentaje(f.tipoIva)}: ${euros(f.iva)}). Guárdalo para Hacienda: no es tuyo.`;
}

/**
 * «Ver el detalle», una frase por tarjeta. Habla de IRPF, como las opciones del alta (David, 24 de
 * noviembre de 2026: «pasa a decir IRPF»).
 * @param {string} cliente   El id de CLIENTES
 * @param {Resultado} f
 */
export function detalle(cliente, f) {
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
 * Desde el pago, si los céntimos no cuadran, la tarjeta lo dice. Si no hace falta, ''.
 * @param {Modo} modo
 * @param {number} importe   Lo que escribió la persona
 * @param {Resultado} f
 */
export function textoRedondeo(modo, importe, f) {
  if (modo !== 'pago' || f.exacto !== false) return '';
  return `Por los céntimos, ${euros(redondear(importe))} no sale exacto: lo más cercano es ${euros(f.total)}.`;
}

/**
 * «Lo que esta cuenta no incluye». Con los casos que no cubre (fase 4 del plan): módulos con
 * transporte o mudanzas (art. 95.6 RIRPF; según la DGT, V2977-21, son las únicas de su lista que
 * siguen en módulos), agricultura y ganadería (cuadro de retenciones de la AEAT de 2026) y Canarias,
 * Ceuta y Melilla (IGIC e IPSI). Decidido por David el 24 de noviembre de 2026.
 */
export function noIncluye() {
  return '«Para ti» no resta tus gastos, la cuota de autónomos ni lo que pagues en la renta. ' +
    'Tampoco hace facturas: te dice qué precio poner. ' +
    'No vale tal cual si estás en módulos con transporte o mudanzas (IRPF del 1 %), si eres agricultor ' +
    'o ganadero (IRPF del 2 %) o si trabajas en Canarias, Ceuta o Melilla, donde no hay IVA. ' +
    `Es orientativa, con las normas de España de ${EJERCICIO}.`;
}
