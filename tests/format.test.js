import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerImporte, euros } from '../src/format.js';

// En España el punto separa los miles: con un campo type="number", «1.000» era 1 €
// (revisión del 24 de noviembre de 2026). leerImporte lee lo que escribe la gente.
test('importes como se escriben en España', () => {
  const casos = {
    '1000': 1000, '1.000': 1000, '12.500': 12500, '1.000.000': 1000000,
    '1.000,50': 1000.5, '100,5': 100.5, '100,': 100, '0,99': 0.99,
  };
  for (const [texto, valor] of Object.entries(casos)) assert.equal(leerImporte(texto), valor, texto);
});

test('importes con punto decimal o en formato inglés', () => {
  const casos = { '100.50': 100.5, '1.5': 1.5, '0.500': 0.5, '1,000.50': 1000.5, '1,000,000': 1000000 };
  for (const [texto, valor] of Object.entries(casos)) assert.equal(leerImporte(texto), valor, texto);
});

test('espacios y signo del euro, fuera', () => {
  assert.equal(leerImporte(' 100 € '), 100);
  assert.equal(leerImporte('1 000'), 1000);
});

test('lo que no es un importe da null', () => {
  for (const texto of ['', '   ', 'abc', '-5', '1.2.3', '1.00,5', '1,000,5', ',5', '1.000,50,2', '12a']) {
    assert.equal(leerImporte(texto), null, JSON.stringify(texto));
  }
});

test('euros: sin punto de miles en las cifras de cuatro dígitos, con él desde cinco', () => {
  assert.equal(euros(1234.5), '1234,50\u00a0€');
  assert.equal(euros(12345.5), '12.345,50\u00a0€');
});
