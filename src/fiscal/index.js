// @ts-check
// Puerta de entrada a las cuentas para quien las usa desde fuera: idruiz-web las importa como
// `cuanto-facturo/fiscal` (package.json, «exports»). Las reglas de cada año y la lógica, juntas.
// Cuando lleguen las reglas de 2027, aquí se elige qué año se exporta (docs/PLAN.md, fase 6).
export * from './reglas-2026.js';
export * from './calculo.js';
