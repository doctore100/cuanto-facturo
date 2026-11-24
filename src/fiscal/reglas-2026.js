// @ts-check
/**
 * Reglas fiscales de 2026 (España, territorio común).
 *
 * Todo lo que cambia de un año a otro vive aquí, como datos.
 * Para 2027 se copia este archivo como reglas-2027.js y se ajustan los valores:
 * la lógica de calculo.js no debería necesitar cambios.
 *
 * Fuentes: art. 101.5 LIRPF y art. 95 RIRPF (retenciones), art. 109.2 RIRPF (modelo 130),
 * Ley 37/1992 del IVA (art. 69 y 84 para inversión del sujeto pasivo).
 */

export const EJERCICIO = 2026;

/** Retenciones de IRPF en facturas de actividades profesionales (secciones 2ª y 3ª del IAE). */
export const RETENCION = {
  general: 0.15,
  nuevoAutonomo: 0.07,
  /** Años naturales con tipo reducido además del año de alta. */
  aniosReducidoTrasAlta: 2,
};

/**
 * Tipos de IVA. La etiqueta va en lenguaje de la calle y sin el porcentaje: la página lo añade
 * desde `tipo`, para que el número salga siempre de aquí.
 */
export const IVA = [
  { id: 'general', etiqueta: 'El normal', tipo: 0.21 },
  { id: 'reducido', etiqueta: 'Reducido', tipo: 0.10 },
  { id: 'superreducido', etiqueta: 'Superreducido', tipo: 0.04 },
  { id: 'exento', etiqueta: 'No lleva IVA (formación, sanidad…)', tipo: 0 },
];

/**
 * Secciones del IAE. Solo las profesionales (2ª y 3ª) llevan retención; la empresarial es la 1ª.
 * Las etiquetas son las de la pregunta «¿A qué te dedicas?» del diseño aprobado (24-11-2026).
 */
export const SECCIONES_IAE = [
  { id: 'profesional', etiqueta: 'Doy un servicio: programo, diseño, asesoro, enseño…', retiene: true },
  { id: 'empresarial', etiqueta: 'Tengo un negocio: tienda, bar, taller…', retiene: false },
];

/**
 * Tipos de cliente, con los nombres de la calle del diseño aprobado (24-11-2026). Lo técnico
 * (NIF-IVA en el VIES, ROI, inversión del sujeto pasivo, operación no sujeta) se queda en estos
 * comentarios y en el programa de facturación de cada uno: la herramienta no hace facturas.
 * - llevaIva: si la factura lleva IVA español.
 * - llevaRetencion: si el cliente tiene que retener (cuando quien factura es profesional).
 */
export const CLIENTES = [
  // Con NIF español y actividad: retiene si quien factura es profesional.
  { id: 'es-b2b', titulo: 'Empresa o autónomo de España', llevaIva: true, llevaRetencion: true },
  // Persona sin actividad económica.
  { id: 'es-b2c', titulo: 'Persona de España', llevaIva: true, llevaRetencion: false },
  // NIF-IVA válido en el VIES; quien factura necesita el ROI. Inversión del sujeto pasivo.
  { id: 'ue-b2b', titulo: 'Empresa de otro país de Europa', llevaIva: false, llevaRetencion: false },
  // Empresa con sede fuera de la UE: operación no sujeta a IVA español.
  { id: 'no-ue', titulo: 'Empresa de fuera de Europa', llevaIva: false, llevaRetencion: false },
];
