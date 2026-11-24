import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  baseParaNeto, facturaParaNeto, retencionAplicable, facturasPorCliente, redondear,
  facturaDesdeBase, facturaDesdePago, opcionesAlta, retencionSinFecha,
} from '../src/fiscal/calculo.js';

const PROFESIONAL = /** @type {const} */ ('profesional');
const EMPRESARIAL = /** @type {const} */ ('empresarial');

test('base para 100 € netos con retención del 7 %', () => {
  assert.equal(baseParaNeto(100, 0.07), 107.53);
});

test('base para 100 € netos con retención del 15 %', () => {
  assert.equal(baseParaNeto(100, 0.15), 117.65);
});

test('sumar el 7 % a X se queda corto (el error típico): con base 107 quedan 99,51 €', () => {
  assert.equal(redondear(107 - redondear(107 * 0.07)), 99.51);
  assert.ok(baseParaNeto(100, 0.07) > 107);
});

test('empresa en España, 7 %: factura de 122,58 €', () => {
  const f = facturaParaNeto({ neto: 100, tipoIva: 0.21, tipoRetencion: 0.07, llevaIva: true, llevaRetencion: true });
  assert.deepEqual(
    { base: f.base, iva: f.iva, retencion: f.retencion, total: f.total, teQueda: f.teQueda },
    { base: 107.53, iva: 22.58, retencion: 7.53, total: 122.58, teQueda: 100 },
  );
});

test('particular en España: 121 € sin retención', () => {
  const f = facturaParaNeto({ neto: 100, tipoIva: 0.21, tipoRetencion: 0.07, llevaIva: true, llevaRetencion: false });
  assert.equal(f.total, 121);
  assert.equal(f.retencion, 0);
});

test('empresa de la UE: sin IVA ni retención', () => {
  const f = facturaParaNeto({ neto: 100, tipoIva: 0.21, tipoRetencion: 0.07, llevaIva: false, llevaRetencion: false });
  assert.equal(f.total, 100);
  assert.equal(f.tipoIva, 0);
});

test('IVA reducido del 10 %: factura de 110,75 € con el 7 %', () => {
  const f = facturaParaNeto({ neto: 100, tipoIva: 0.10, tipoRetencion: 0.07, llevaIva: true, llevaRetencion: true });
  assert.deepEqual(
    { base: f.base, iva: f.iva, retencion: f.retencion, total: f.total, teQueda: f.teQueda },
    { base: 107.53, iva: 10.75, retencion: 7.53, total: 110.75, teQueda: 100 },
  );
});

test('servicio exento de IVA: la factura es la base menos la retención', () => {
  const f = facturaParaNeto({ neto: 100, tipoIva: 0, tipoRetencion: 0.15, llevaIva: true, llevaRetencion: true });
  assert.equal(f.iva, 0);
  assert.equal(f.total, 100);
  assert.equal(f.base, 117.65);
});

test('te queda siempre lo pedido, para muchos importes', () => {
  for (let neto = 1; neto <= 5000; neto += 13.37) {
    const n = Math.round(neto * 100) / 100;
    for (const r of [0, 0.07, 0.15]) {
      const f = facturaParaNeto({ neto: n, tipoIva: 0.21, tipoRetencion: r, llevaIva: true, llevaRetencion: true });
      assert.ok(f.teQueda >= n && f.teQueda - n <= 0.01, `neto ${n}, retención ${r}: queda ${f.teQueda}`);
    }
  }
});

test('alta en marzo de 2025: 7 % de 2025 a 2027, 15 % en 2028', () => {
  const base = { seccion: PROFESIONAL, fechaAlta: '2025-03-10' };
  assert.equal(retencionAplicable({ ...base, fechaFactura: '2025-03-10' }).tipo, 0.07);
  assert.equal(retencionAplicable({ ...base, fechaFactura: '2026-11-20' }).tipo, 0.07);
  assert.equal(retencionAplicable({ ...base, fechaFactura: '2027-12-31' }).tipo, 0.07);
  const r2028 = retencionAplicable({ ...base, fechaFactura: '2028-01-01' });
  assert.equal(r2028.tipo, 0.15);
  assert.match(r2028.motivo, /alta fue en 2025/);
  assert.equal(r2028.aviso, false);
});

test('el 7 % es opcional', () => {
  const r = retencionAplicable({ seccion: PROFESIONAL, fechaAlta: '2025-03-10', fechaFactura: '2026-11-20', preferir15: true });
  assert.equal(r.tipo, 0.15);
  assert.equal(r.reducidoHasta, 2027);
});

test('sin fecha de alta: 15 % general, sin aviso', () => {
  for (const fechaAlta of [undefined, '', 'no-es-fecha']) {
    const r = retencionAplicable({ seccion: PROFESIONAL, fechaAlta, fechaFactura: '2026-11-20' });
    assert.equal(r.tipo, 0.15);
    assert.equal(r.aviso, false);
    assert.equal(r.reducidoHasta, null);
  }
});

test('factura anterior al año de alta: 15 % y aviso para revisar las fechas', () => {
  const r = retencionAplicable({ seccion: PROFESIONAL, fechaAlta: '2027-03-01', fechaFactura: '2026-11-20' });
  assert.equal(r.tipo, 0.15);
  assert.equal(r.aviso, true);
  assert.match(r.motivo, /revisa las fechas/);
});

test('actividad empresarial: sin retención', () => {
  const r = retencionAplicable({ seccion: EMPRESARIAL, fechaAlta: '2025-03-10', fechaFactura: '2026-11-20' });
  assert.equal(r.tipo, 0);
});

test('facturasPorCliente devuelve los cuatro casos', () => {
  const { casos } = facturasPorCliente({
    neto: 100, tipoIva: 0.21, seccion: PROFESIONAL, fechaAlta: '2025-03-10', fechaFactura: '2026-11-20',
  });
  assert.deepEqual(casos.map((c) => c.factura.total), [122.58, 121, 100, 100]);
});

test('facturasPorCliente con actividad empresarial: la empresa española no retiene', () => {
  const { casos } = facturasPorCliente({
    neto: 100, tipoIva: 0.21, seccion: EMPRESARIAL, fechaAlta: '2025-03-10', fechaFactura: '2026-11-20',
  });
  assert.deepEqual(casos.map((c) => c.factura.total), [121, 121, 100, 100]);
});

// ── Al revés (diseño aprobado del 24-11-2026, «Cómo calcula»; guía de instalación, paso A2) ──

/** Una empresa o autónomo de España con el IVA normal y la retención que se pida. */
const empresa = (tipoRetencion) => ({ tipoIva: 0.21, tipoRetencion, llevaIva: true, llevaRetencion: true });
/** Una persona de España: IVA, sin retención. */
const persona = { tipoIva: 0.21, tipoRetencion: 0.15, llevaIva: true, llevaRetencion: false };

test('desde el precio: 117,65 € con el 15 % dejan 100,00 €; a una persona, 117,65 € y paga 142,36 €', () => {
  const f = facturaDesdeBase({ base: 117.65, ...empresa(0.15) });
  assert.deepEqual([f.total, f.teQueda, f.iva, f.retencion, f.exacto], [124.71, 100, 24.71, 17.65, true]);
  const p = facturaDesdeBase({ base: 117.65, ...persona });
  assert.deepEqual([p.total, p.teQueda], [142.36, 117.65]);
});

test('desde el pago: 124,71 € con el 15 % salen de un precio de 117,65 € (a una persona, 103,07 €)', () => {
  const f = facturaDesdePago({ pago: 124.71, ...empresa(0.15) });
  assert.deepEqual([f.base, f.teQueda, f.exacto], [117.65, 100, true]);
  assert.equal(facturaDesdePago({ pago: 124.71, ...persona }).teQueda, 103.07);
});

test('desde el pago: 122,58 € con el 7 % dejan 100,00 €; a una persona, 101,31 € y no sale exacto', () => {
  const f = facturaDesdePago({ pago: 122.58, ...empresa(0.07) });
  assert.deepEqual([f.base, f.teQueda, f.exacto], [107.53, 100, true]);
  const p = facturaDesdePago({ pago: 122.58, tipoIva: 0.21, tipoRetencion: 0.07, llevaIva: true, llevaRetencion: false });
  assert.deepEqual([p.teQueda, p.total, p.exacto], [101.31, 122.59, false]);
});

test('desde el pago: 100,02 € con el 15 % no sale exacto; lo más cercano es 100,03 € con 94,36 €', () => {
  const f = facturaDesdePago({ pago: 100.02, ...empresa(0.15) });
  assert.deepEqual([f.total, f.base, f.exacto], [100.03, 94.36, false]);
});

test('ida y vuelta: ganar X → lo que te pagan → otra vez X', () => {
  for (const r of [0.15, 0.07, 0]) {
    for (let c = 1; c <= 300000; c += 97) {
      const x = c / 100;
      const ida = facturaParaNeto({ neto: x, ...empresa(r) });
      const vuelta = facturaDesdePago({ pago: ida.total, ...empresa(r) });
      assert.equal(vuelta.teQueda, x, `ganar ${x} con el ${r}`);
      assert.equal(vuelta.exacto, true);
    }
  }
});

test('desde el pago: ningún precio da un pago más cercano (búsqueda de ±50 céntimos)', () => {
  const casos = [[0.21, 0.15], [0.21, 0.07], [0.10, 0.15], [0.04, 0.07], [0, 0.15], [0.21, 0]];
  for (const [tipoIva, tipoRetencion] of casos) {
    const c = { tipoIva, tipoRetencion, llevaIva: true, llevaRetencion: true };
    for (let centimos = 0; centimos <= 200000; centimos += 37) {
      const pago = centimos / 100;
      const f = facturaDesdePago({ pago, ...c });
      const guia = redondear(pago / (1 + tipoIva - tipoRetencion));
      let mejor = Infinity;
      for (let d = -50; d <= 50; d++) {
        const base = redondear(guia + d / 100);
        if (base >= 0) mejor = Math.min(mejor, Math.abs(facturaDesdeBase({ base, ...c }).total - pago));
      }
      assert.ok(Math.abs(f.total - pago) <= mejor + 1e-9, `pago ${pago}, IVA ${tipoIva}, retención ${tipoRetencion}`);
      assert.ok(Math.abs(f.total - pago) <= 0.01 + 1e-9, `pago ${pago}: a más de un céntimo`);
    }
  }
});

test('desde el precio o el pago: sin importe, todo a cero; nunca negativo', () => {
  assert.equal(facturaDesdeBase({ base: 0, ...empresa(0.15) }).total, 0);
  assert.equal(facturaDesdePago({ pago: 0, ...empresa(0.15) }).base, 0);
  assert.equal(facturaDesdePago({ pago: -5, ...empresa(0.15) }).base, 0);
});

// ── La pregunta del alta, sin fecha (guía, paso A3) ──

test('los años de la pregunta del alta salen del año de hoy', () => {
  assert.deepEqual(opcionesAlta('2026-11-24'), { desde: 2024, anios: [2024, 2025, 2026] });
  assert.deepEqual(opcionesAlta('2027-01-01'), { desde: 2025, anios: [2025, 2026, 2027] });
  assert.deepEqual(opcionesAlta('2028-06-15'), { desde: 2026, anios: [2026, 2027, 2028] });
  assert.throws(() => opcionesAlta('24/11/2026'), RangeError);
});

test('retención sin fecha: negocio 0; alta reciente 7 %, o 15 % si lo prefiere; alta antigua 15 %', () => {
  assert.equal(retencionSinFecha({ seccion: EMPRESARIAL, altaReciente: true }), 0);
  assert.equal(retencionSinFecha({ seccion: PROFESIONAL, altaReciente: true }), 0.07);
  assert.equal(retencionSinFecha({ seccion: PROFESIONAL, altaReciente: true, preferir15: true }), 0.15);
  assert.equal(retencionSinFecha({ seccion: PROFESIONAL, altaReciente: false }), 0.15);
});
