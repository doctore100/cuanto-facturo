// @ts-check
const fmt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * 1234.5 → "1234,50 €"; 12345.5 → "12.345,50 €". En español las cifras de cuatro dígitos no llevan
 * punto de miles, y así lo hace Intl con es-ES.
 * @param {number} n
 */
export const euros = (n) => `${fmt.format(n)} €`;

/**
 * 0.07 → "7 %"
 * @param {number} t
 */
export const porcentaje = (t) => `${String(Math.round(t * 1000) / 10).replace('.', ',')} %`;

/**
 * 100 → "100,00"
 * @param {number} n
 */
export const numero = (n) => fmt.format(n);

/** Fecha de hoy en ISO local (yyyy-mm-dd). */
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Un número entero con grupos de miles: «1.000», «12.500», «1.000.000».
 * @param {'.' | ','} sep
 */
const conMiles = (sep) => new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`);

/**
 * Lee un importe tal como lo escribe la gente en España. Hace falta porque en España el punto
 * separa los miles: con un campo `type="number"`, «1.000» era 1 € (revisión del 24-11-2026).
 *
 * - Con punto y coma, el último que aparece es el decimal: «1.000,50» y también «1,000.50».
 * - Solo con coma, la coma es el decimal: «100,5». Con varias, son de miles.
 * - Solo con punto: si todos los grupos de después tienen tres cifras, son de miles («1.000»,
 *   «12.500», «1.000.000»); si no, el punto es el decimal («100.50», «1.5»). «0.500» es 0,5.
 * - Se ignoran los espacios y el signo del euro.
 *
 * @param {string} texto
 * @returns {number | null}   null si no es un importe (vacío, letras, negativo, mal agrupado)
 */
export function leerImporte(texto) {
  let s = String(texto).replace(/[\s\u00a0€]/g, '');
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const ultimoPunto = s.lastIndexOf('.');
  const ultimaComa = s.lastIndexOf(',');
  if (ultimoPunto >= 0 && ultimaComa >= 0) {
    const decimal = ultimoPunto > ultimaComa ? '.' : ',';
    const miles = decimal === '.' ? ',' : '.';
    const i = s.lastIndexOf(decimal);
    const entero = s.slice(0, i);
    const resto = s.slice(i + 1);
    if (resto.includes(miles) || !conMiles(miles).test(entero)) return null;
    s = `${entero.split(miles).join('')}.${resto}`;
  } else if (ultimaComa >= 0) {
    const comas = s.split(',').length - 1;
    if (comas === 1) s = s.replace(',', '.');
    else if (conMiles(',').test(s)) s = s.split(',').join('');
    else return null;
  } else if (ultimoPunto >= 0) {
    const puntos = s.split('.').length - 1;
    const [entero] = s.split('.');
    if (puntos > 1 || (/^\d+\.\d{3}$/.test(s) && entero !== '0')) {
      if (!conMiles('.').test(s)) return null;
      s = s.split('.').join('');
    }
  }
  if (!/^\d+(\.\d*)?$/.test(s)) return null;
  return Number(s);
}
