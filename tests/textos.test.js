import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facturaParaNeto, facturaDesdePago } from '../src/fiscal/calculo.js';
import * as textos from '../src/textos.js';

// Las cifras van unidas a su signo con un espacio que no se rompe (format.js, ESPACIO). Aquí se
// comparan con espacios normales, que se leen mejor; el último test comprueba que están.
const plano = (v) => JSON.parse(JSON.stringify(v).replace(/\u00a0/g, ' '));
const { MODOS, RESPUESTAS_INICIALES } = textos;
const textosAlta = (...a) => plano(textos.textosAlta(...a));
const opcionesIva = () => plano(textos.opcionesIva());
const avisoRetencion = (...a) => plano(textos.avisoRetencion(...a));
const detalle = (...a) => plano(textos.detalle(...a));
const textoRedondeo = (...a) => plano(textos.textoRedondeo(...a));
const noIncluye = () => plano(textos.noIncluye());
const resultado = (...a) => plano(textos.resultado(...a));

// Los textos del diseño aprobado (negocio/cuanto-facturo-diseno.md del centro de control), con la
// decisión del 24 de noviembre de 2026: «Ver el detalle» habla de IRPF.

const empresa = (tipoRetencion) => ({ tipoIva: 0.21, tipoRetencion, llevaIva: true, llevaRetencion: true });
const persona = { tipoIva: 0.21, tipoRetencion: 0.15, llevaIva: true, llevaRetencion: false };

test('la pregunta del importe cambia con lo que se quiere saber', () => {
  assert.equal(MODOS.ganar.titulo, '¿Cuánto quieres ganar?');
  assert.equal(MODOS.pago.ayuda, 'Lo que te llega al banco.');
});

test('las opciones del alta salen del año de hoy y de las reglas', () => {
  assert.deepEqual(textosAlta('2026-11-24'), {
    antes: 'Antes de 2024, o no lo sé',
    reciente: 'En 2024, 2025 o 2026',
    irpfAntes: 'IRPF 15 %',
    irpfReciente: 'IRPF 7 %',
    ayuda: 'El 7 %, solo si el año antes no trabajabas por tu cuenta.',
    prefiero15: 'Prefiero que me quiten el 15 % aunque me toque el 7 %',
  });
  assert.equal(textosAlta('2027-01-01').antes, 'Antes de 2025, o no lo sé');
});

test('las opciones del IVA llevan el porcentaje de las reglas', () => {
  assert.deepEqual(opcionesIva(), [
    { texto: 'El normal (21 %)', valor: '0.21' },
    { texto: 'Reducido (10 %)', valor: '0.1' },
    { texto: 'Superreducido (4 %)', valor: '0.04' },
    { texto: 'No lleva IVA (formación, sanidad…)', valor: '0' },
  ]);
});

test('el aviso de la retención, en sus cuatro casos', () => {
  assert.equal(avisoRetencion({ servicio: false, reciente: true, prefiere15: false }),
    'Con un negocio, en la factura no te quitan nada para Hacienda.');
  assert.equal(avisoRetencion({ servicio: true, reciente: false, prefiere15: false }),
    'Las empresas de España te quitan un 15 % de IRPF para Hacienda.');
  assert.equal(avisoRetencion({ servicio: true, reciente: true, prefiere15: false }),
    'Las empresas de España te quitan un 7 % de IRPF para Hacienda. Dura el año de tu alta y los dos siguientes; después, un 15 %.');
  assert.equal(avisoRetencion({ servicio: true, reciente: true, prefiere15: true }),
    'Has elegido que te quiten un 15 % de IRPF aunque te toque el 7 %.');
});

test('«Ver el detalle» de la empresa de España habla de IRPF', () => {
  const f = facturaParaNeto({ neto: 100, ...empresa(0.15) });
  assert.equal(detalle('es-b2b', f),
    'Tu programa sumará el IVA (21 %: 24,71 €). Guárdalo para Hacienda: no es tuyo. Y restará el IRPF (15 %: 17,65 €): tu cliente se lo paga a Hacienda por ti. No lo pierdes: se descuenta de tu renta.');
  const negocio = facturaParaNeto({ neto: 100, ...empresa(0) });
  assert.equal(detalle('es-b2b', negocio),
    'Tu programa sumará el IVA (21 %: 21,00 €). Guárdalo para Hacienda: no es tuyo. Con un negocio, no se resta IRPF.');
});

test('«Ver el detalle» de los otros tres clientes', () => {
  const f = facturaParaNeto({ neto: 100, ...persona });
  assert.equal(detalle('es-b2c', f), 'Tu programa sumará el IVA (21 %: 21,00 €). Guárdalo para Hacienda: no es tuyo. A una persona no se le resta IRPF.');
  const sinIva = facturaParaNeto({ neto: 100, tipoIva: 0, tipoRetencion: 0, llevaIva: true, llevaRetencion: false });
  assert.equal(detalle('es-b2c', sinIva), 'Lo que haces no lleva IVA. A una persona no se le resta IRPF.');
  assert.match(detalle('ue-b2b', f), /^Sin IVA: lo paga tu cliente en su país/);
  assert.equal(detalle('no-ue', f), 'Sin IVA y sin IRPF: lo que pones es lo que cobras.');
});

test('la línea de los céntimos, solo desde el pago y cuando no sale exacto', () => {
  const inexacto = facturaDesdePago({ pago: 122.58, tipoIva: 0.21, tipoRetencion: 0.07, llevaIva: true, llevaRetencion: false });
  assert.equal(textoRedondeo('pago', 122.58, inexacto), 'Por los céntimos, 122,58 € no sale exacto: lo más cercano es 122,59 €.');
  const exacto = facturaDesdePago({ pago: 124.71, ...empresa(0.15) });
  assert.equal(textoRedondeo('pago', 124.71, exacto), '');
  assert.equal(textoRedondeo('ganar', 122.58, inexacto), '');
});

test('lo que esta cuenta no incluye: los casos que no cubre y las normas de España del año', () => {
  const t = noIncluye();
  assert.match(t, /módulos con transporte o mudanzas \(IRPF del 1 %\)/);
  assert.match(t, /agricultor o ganadero \(IRPF del 2 %\)/);
  assert.match(t, /Canarias, Ceuta o Melilla, donde no hay IVA/);
  assert.match(t, /Es orientativa, con las normas de España de 2026\.$/);
});

test('resultado: al abrir la página, ganar 100 € con el 15 %', () => {
  const { aviso, tarjetas } = resultado(RESPUESTAS_INICIALES);
  assert.equal(aviso, 'Las empresas de España te quitan un 15 % de IRPF para Hacienda.');
  assert.deepEqual(tarjetas.map((t) => t.titulo),
    ['Empresa o autónomo de España', 'Persona de España', 'Empresa de otro país de Europa', 'Empresa de fuera de Europa']);
  const [empresa] = tarjetas;
  assert.deepEqual(empresa.grande, { texto: 'Pon de precio (sin IVA)', importe: '117,65 €', tuyo: false });
  assert.deepEqual(empresa.filas, [
    { texto: 'Tu cliente te pagará', importe: '124,71 €', tuyo: false },
    { texto: 'Para ti', importe: '100,00 €', tuyo: true },
    { texto: 'Guarda para Hacienda', importe: '24,71 €', tuyo: false },
  ]);
  assert.equal(tarjetas[3].filas[2].importe, 'Nada');
});

test('resultado: al revés, lo grande es lo tuyo; y la línea de los céntimos', () => {
  const { tarjetas } = resultado({ ...RESPUESTAS_INICIALES, modo: 'pago', importe: 122.58, reciente: true });
  assert.deepEqual(tarjetas[0].grande, { texto: 'Para ti', importe: '100,00 €', tuyo: true });
  assert.equal(tarjetas[0].redondeo, '');
  assert.equal(tarjetas[1].grande.importe, '101,31 €');
  assert.equal(tarjetas[1].redondeo, 'Por los céntimos, 122,58 € no sale exacto: lo más cercano es 122,59 €.');
});

test('resultado: con un negocio no hay retención', () => {
  const { aviso, tarjetas } = resultado({ ...RESPUESTAS_INICIALES, servicio: false });
  assert.match(aviso, /^Con un negocio/);
  assert.equal(tarjetas[0].filas[0].importe, '121,00 €');
  assert.match(tarjetas[0].detalle, /Con un negocio, no se resta IRPF\.$/);
});

test('las cifras y su signo no se separan: espacio que no se rompe', () => {
  assert.match(textos.avisoRetencion({ servicio: true, reciente: false, prefiere15: false }), /15\u00a0%/);
  assert.match(textos.resultado(RESPUESTAS_INICIALES).tarjetas[0].grande.importe, /^117,65\u00a0€$/);
  assert.match(textos.noIncluye(), /IRPF del 1\u00a0%/);
});
