// @ts-check
/**
 * Lógica fiscal pura: sin DOM, sin estado, fácil de testear.
 * Todos los importes en euros; se redondean a céntimos en cada línea de la factura,
 * igual que se haría en una factura real.
 */
import { RETENCION, CLIENTES } from './reglas-2026.js';

/**
 * Redondeo a céntimos.
 * @param {number} n
 */
export const redondear = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Año de una fecha ISO (yyyy-mm-dd), o null si no lo es.
 * @param {string | undefined} fecha
 */
function anio(fecha) {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  return Number(fecha.slice(0, 4));
}

/**
 * @typedef {Object} DatosRetencion
 * @property {'profesional'|'empresarial'} seccion
 * @property {string} [fechaAlta]    ISO yyyy-mm-dd
 * @property {string} fechaFactura   ISO yyyy-mm-dd
 * @property {boolean} [preferir15]  El 7 % es opcional
 */

/**
 * @typedef {Object} Retencion
 * @property {number} tipo                 0, 0,07 o 0,15
 * @property {string} motivo               Explicación para mostrar
 * @property {number|null} reducidoHasta   Último año con derecho al 7 %, si lo hay
 * @property {boolean} aviso               Los datos no cuadran (p. ej. factura anterior al alta)
 */

/**
 * Tipo de retención aplicable a un cliente que retiene, con su explicación.
 * El 7 % vale en el año de alta y en los dos siguientes (art. 101.5.a LIRPF y 95.1 RIRPF).
 * @param {DatosRetencion} d
 * @returns {Retencion}
 */
export function retencionAplicable(d) {
  if (d.seccion !== 'profesional') {
    return { tipo: 0, motivo: 'Actividad empresarial: tus facturas no llevan retención.', reducidoHasta: null, aviso: false };
  }
  const anioAlta = anio(d.fechaAlta);
  if (anioAlta === null) {
    return {
      tipo: RETENCION.general,
      motivo: 'Sin fecha de alta se aplica el 15 % general. Si te diste de alta este año o en los dos anteriores, ponla: puede tocarte el 7 %.',
      reducidoHasta: null,
      aviso: false,
    };
  }
  const anioFactura = anio(d.fechaFactura) ?? anioAlta;
  const limite = anioAlta + RETENCION.aniosReducidoTrasAlta;

  if (anioFactura < anioAlta) {
    return {
      tipo: RETENCION.general,
      motivo: `La factura es de ${anioFactura} y tu alta, de ${anioAlta}: revisa las fechas. Mientras, se calcula con el 15 % general.`,
      reducidoHasta: null,
      aviso: true,
    };
  }
  if (anioFactura <= limite) {
    if (d.preferir15) {
      return {
        tipo: RETENCION.general,
        motivo: `Puedes aplicar el 7 % hasta el 31/12/${limite}, pero has elegido el 15 %.`,
        reducidoHasta: limite,
        aviso: false,
      };
    }
    return {
      tipo: RETENCION.nuevoAutonomo,
      motivo: `Nuevo autónomo: 7 % hasta el 31/12/${limite}. Desde ${limite + 1}, 15 %.`,
      reducidoHasta: limite,
      aviso: false,
    };
  }
  return {
    tipo: RETENCION.general,
    motivo: `Tu alta fue en ${anioAlta}: el 7 % valía ese año y los dos siguientes, hasta ${limite}. Ahora, 15 % general.`,
    reducidoHasta: null,
    aviso: false,
  };
}

/**
 * Base imponible mínima para que base − retención = neto.
 * Base = neto ÷ (1 − retención), ajustada al céntimo por el redondeo.
 * @param {number} neto
 * @param {number} tipoRetencion
 */
export function baseParaNeto(neto, tipoRetencion) {
  let base = redondear(neto / (1 - tipoRetencion));
  for (let i = 0; i < 5 && redondear(base - redondear(base * tipoRetencion)) < neto; i++) {
    base = redondear(base + 0.01);
  }
  return base;
}

/**
 * @typedef {Object} Factura
 * @property {number} base
 * @property {number} tipoIva           0 si no lleva IVA
 * @property {number} iva
 * @property {number} tipoRetencion     0 si no lleva retención
 * @property {number} retencion
 * @property {number} total             Lo que te ingresa el cliente
 * @property {number} apartarHacienda   El IVA, que no es tuyo
 * @property {number} teQueda           Total − IVA
 */

/**
 * @typedef {Object} Condiciones   Lo que cambia de un cliente a otro
 * @property {number} tipoIva         El IVA de lo que haces (0,21; 0,10; 0,04 o 0)
 * @property {number} tipoRetencion   La retención de quien factura (0, 0,07 o 0,15)
 * @property {boolean} llevaIva       Si a este cliente se le cobra IVA español
 * @property {boolean} llevaRetencion Si este cliente retiene
 */

/**
 * Las cuentas de una factura a partir del precio sin IVA, como en una factura real: el IVA y la
 * retención se redondean al céntimo cada uno por su lado.
 * @param {number} base
 * @param {number} tipoIva         Ya en 0 si el cliente no lleva IVA
 * @param {number} tipoRetencion   Ya en 0 si el cliente no retiene
 * @returns {Factura}
 */
function cuentas(base, tipoIva, tipoRetencion) {
  const iva = redondear(base * tipoIva);
  const retencion = redondear(base * tipoRetencion);
  const total = redondear(base + iva - retencion);
  return {
    base,
    tipoIva,
    iva,
    tipoRetencion,
    retencion,
    total,
    apartarHacienda: iva,
    teQueda: redondear(total - iva),
  };
}

/**
 * Los tipos que tocan a este cliente: sin IVA o sin retención, 0.
 * @param {Condiciones} c
 */
const tiposDe = (c) => ({ iva: c.llevaIva ? c.tipoIva : 0, retencion: c.llevaRetencion ? c.tipoRetencion : 0 });

/**
 * Factura completa a partir de lo que quieres en el bolsillo.
 * @param {{ neto: number } & Condiciones} p
 * @returns {Factura}
 */
export function facturaParaNeto(p) {
  const t = tiposDe(p);
  return cuentas(baseParaNeto(p.neto, t.retencion), t.iva, t.retencion);
}

/**
 * @typedef {Factura & { exacto: boolean }} FacturaAlReves
 * `exacto` es falso cuando lo que te pagan no sale con ningún precio (ver facturaDesdePago).
 */

/**
 * Al revés, desde el precio: «si pongo este precio, ¿cuánto me queda?». Decidido el 24-11-2026
 * (diseño aprobado, variante C; docs/PLAN.md, fase 1).
 * @param {{ base: number } & Condiciones} p
 * @returns {FacturaAlReves}
 */
export function facturaDesdeBase(p) {
  const t = tiposDe(p);
  return { ...cuentas(redondear(Math.max(0, p.base)), t.iva, t.retencion), exacto: true };
}

/**
 * Al revés, desde lo que te pagan: «si me pagan esto, ¿cuánto me queda?».
 *
 * Busca el precio, en céntimos, cuyo pago se acerca más. No todos los pagos son posibles, porque el
 * IVA y la retención se redondean cada uno por su lado: con un 21 % de IVA y un 15 % de retención,
 * un céntimo más de precio sube el pago 1,06 céntimos, y algunos pagos se saltan. Entonces
 * `exacto` es falso y `total` es el pago posible más cercano.
 *
 * Se mira el precio que sale de dividir y los tres céntimos a cada lado (los tests lo comparan con
 * una búsqueda de ±50 céntimos). Si dos precios quedan igual de cerca, gana el más próximo a esa
 * división, como hacía el prototipo.
 * @param {{ pago: number } & Condiciones} p
 * @returns {FacturaAlReves}
 */
export function facturaDesdePago(p) {
  const t = tiposDe(p);
  const pago = redondear(Math.max(0, p.pago));
  const inicial = Math.max(0, redondear(pago / (1 + t.iva - t.retencion)));
  let mejor = cuentas(inicial, t.iva, t.retencion);
  for (const centimos of [1, -1, 2, -2, 3, -3]) {
    const base = redondear(inicial + centimos / 100);
    if (base < 0) continue;
    const f = cuentas(base, t.iva, t.retencion);
    if (Math.abs(f.total - pago) < Math.abs(mejor.total - pago) - 1e-9) mejor = f;
  }
  return { ...mejor, exacto: mejor.total === pago };
}

/**
 * Los años de la pregunta «¿Cuándo te diste de alta de autónomo?», a partir de la fecha de hoy.
 * El 7 % vale el año del alta y los dos siguientes (art. 101.5.a LIRPF y 95.1 RIRPF), así que con
 * 2026 las opciones son «antes de 2024» y «en 2024, 2025 o 2026». El año que viene se mueven solas.
 * @param {string} fechaISO   yyyy-mm-dd
 * @returns {{ desde: number, anios: number[] }}
 */
export function opcionesAlta(fechaISO) {
  const a = anio(fechaISO);
  if (a === null) throw new RangeError(`opcionesAlta necesita una fecha yyyy-mm-dd: ${fechaISO}`);
  const desde = a - RETENCION.aniosReducidoTrasAlta;
  return { desde, anios: Array.from({ length: RETENCION.aniosReducidoTrasAlta + 1 }, (_, i) => desde + i) };
}

/**
 * La retención sin fecha de alta: la de la pregunta de dos opciones del diseño aprobado. Con un
 * alta reciente se aplica el 7 % directamente, sin inventar una fecha (con una inventada, el aviso
 * diría mal hasta cuándo dura). `retencionAplicable`, la de la fecha, sigue para los avisos con
 * fecha de la fase 2.
 * @param {{ seccion: 'profesional'|'empresarial', altaReciente: boolean, preferir15?: boolean }} d
 * @returns {number}
 */
export function retencionSinFecha(d) {
  if (d.seccion !== 'profesional') return 0;
  return d.altaReciente && !d.preferir15 ? RETENCION.nuevoAutonomo : RETENCION.general;
}

/**
 * Las facturas para todos los tipos de cliente a la vez.
 * @param {{ neto: number, tipoIva: number } & DatosRetencion} d
 */
export function facturasPorCliente(d) {
  const ret = retencionAplicable(d);
  return {
    retencion: ret,
    casos: CLIENTES.map((c) => ({
      cliente: c,
      factura: facturaParaNeto({
        neto: d.neto,
        tipoIva: d.tipoIva,
        tipoRetencion: ret.tipo,
        llevaIva: c.llevaIva,
        llevaRetencion: c.llevaRetencion,
      }),
    })),
  };
}
