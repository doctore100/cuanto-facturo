# Plan de ampliación

Estado actual (v0.4, 24 de noviembre de 2026): la variante C aprobada. Dice qué precio poner para ganar X, o al revés, cuánto te queda de un precio o de lo que te pagan, para los cuatro tipos de cliente a la vez. La fecha de alta no se escribe: son dos opciones con el IRPF. Lógica separada de la interfaz, con tests, estilo de la marca IDRuiz, sin recursos externos y sin guardar nada en el navegador. Lista para que la use `idruiz-web` (`cuanto-facturo/fiscal` y `cuanto-facturo/format`).

**La idea** (David, 23 de noviembre de 2026): una herramienta sencilla en lenguaje de la calle, no un programa de facturación. «La idea es simple: cuánto tengo que poner en el total para ganar X, o quiero ganar X, qué debo poner.» Lo técnico se lo deja cada uno a su programa de facturación. Antes de añadir algo, preguntarse si una persona sin conocimientos fiscales lo entiende y lo necesita.

**Lo decidido el 24 de noviembre de 2026** (detalle en el centro de control, docs.idruiz.com):
- **Diseño:** la variante C del prototipo (`prototipo/c-tarjetas.html`, rama `prototipo/lenguaje-sencillo`): cuatro tarjetas a la vista, cálculo al revés y la fecha de alta como dos opciones con el IRPF. Ver `negocio/cuanto-facturo-diseno.md`.
- **Dónde:** `idruiz.com/herramientas/cuanto-facturo/`, como página de `idruiz-web` (Astro, sin librerías), con un artículo en el blog. Ver `negocio/cuanto-facturo-web-y-seo.md`.
- **Cuándo:** después de la migración de la web a Cloudflare. Paso a paso en `web/instalar-cuanto-facturo.md`.

Prioridad: **alto impacto y poco esfuerzo primero**.

---

## Fuera del alcance: no genera facturas

Decidido por David el 23 de noviembre de 2026: **la calculadora no genera facturas**, ni borradores en PDF, ni lleva un registro de las facturas emitidas. Da los importes y la persona los pasa a su programa de facturación o a su asesoría.

Por qué: un programa con el que se emiten facturas es un sistema informático de facturación y tiene que cumplir el reglamento Verifactu (RD 1007/2023): registro de cada factura con huella y encadenamiento, código QR, y declaración responsable de quien lo fabrica.

- Fechas en vigor (RDL 15/2025): 1 de enero de 2027 para quien tributa en el Impuesto sobre Sociedades y 1 de julio de 2027 para el resto, autónomos incluidos.
- Hacienda anunció el 5 de octubre de 2026 que lo retrasará a octubre de 2028, pero a 23 de noviembre de 2026 no está en el BOE.
- Fuentes: nota informativa de la AEAT sobre la ampliación del plazo de los SIF; folleto de actividades económicas de la AEAT, 5.12; La Razón, 23 de noviembre de 2026.

Si algún día se quiere, la salida es exportar los importes a un programa de facturación que ya cumpla, no hacer uno.

---

## Fase 1 — Más modos de cálculo

- [x] **Modo inverso** (v0.4, 24 de noviembre): «Cuánto me queda si pongo un precio» (`facturaDesdeBase`) y «Cuánto me queda de lo que me van a pagar» (`facturaDesdePago`), con tests. Desde el pago, si los céntimos no cuadran, avisa del pago posible más cercano.
- [ ] **Tarifa por hora / por proyecto:** metes lo que quieres ganar al mes y tus horas facturables → tarifa mínima por hora. **Fuera de la v0.4:** lo decidió David el 24 de noviembre de 2026.
- ~~**Varias líneas** (horas + licencias + desplazamiento), cada una con su IVA, para calcular el total.~~ Descartado el 23 de noviembre: es cosa de un programa de facturación, no de esta herramienta.

## Fase 2 — Que el usuario no tenga que saber nada

- [ ] **Detectar la sección desde el epígrafe IAE:** escribes `763` y sabe que eres profesional. Tabla IAE → sección → CNAE-2025 en `src/fiscal/iae.js`.
- ~~**Asistente de tipo de cliente:** "¿tiene NIF?", "¿es de la UE?", "¿está en el VIES?".~~ Descartado el 23 de noviembre: David prefiere que los cuatro tipos de cliente salgan solos, a la vez, sin preguntar a quién le cobras.
- [ ] **Avisos con fecha:** "en 2028 pasas al 15 %", "fin de tarifa plana", "este año te toca el modelo 130".

## Fase 3 — Beneficio real

- [ ] Gastos mensuales y cuota de autónomos (tabla de tramos 2026 como datos).
- [ ] Estimación del IRPF anual por tramos (estatal + autonómico), mínimo personal, reducciones (art. 32.2.3 y 20 % por inicio de actividad).
- [ ] Resultado de la renta: **IRPF calculado − retenciones − pagos del 130** → a pagar o a devolver.
- [ ] Modo "quiero X € de beneficio real" sobre todo lo anterior.
- [ ] Antes de empezar: comprobar las cifras aproximadas de `ORIGEN.md` (tramos de Extremadura, ejemplo de 15.000 €) y las tablas de cotización de 2026.

## Fase 4 — Más tipos de autónomo

Tipos comprobados en el cuadro de retenciones de la AEAT de 2026 (el vigente desde el 10 de septiembre):

- [ ] Estimación objetiva (módulos): retención del 1 %.
- [ ] Agrícolas, ganaderas y forestales: 2 % en general; 1 % en engorde de porcino y avicultura.
- [ ] Alquileres: 19 %. (Los cursos y conferencias van al 15 %, como el general; no al 19 %.)
- [ ] Artistas con menos de 15.000 € de ingresos del año anterior y más del 75 % del total: 7 % (epígrafes 851, 852, 853, 861, 862, 864 y 869 de la sección 2ª, y agrupaciones 01, 02, 03 y 05 de la 3ª).
- [ ] Ceuta, Melilla y, en 2026, La Palma (RDL 23/2026): retención reducida un 60 %.
- [ ] Recargo de equivalencia (comercio minorista).
- [ ] Particulares de la UE: IVA del país del cliente (régimen OSS).
- [ ] Escalas autonómicas de todas las CCAA.

## Fase 5 — Más allá del cálculo (sin facturas)

- [ ] Exportar el cálculo a CSV / hoja de cálculo para pasarlo al programa de facturación o a la asesoría.
- [ ] Previsión trimestral del 303 y del 130 a partir de los totales que metas tú (sin registrar facturas).

## Fase 6 — Producto

- [ ] **Reglas por año** (`reglas-2027.js`…) seleccionadas por la fecha de la factura. **La primera semana de enero de 2027:** comprobar las retenciones de 2027 en el BOE y la AEAT (a 18 de noviembre de 2026 no había ninguna norma que cambiara el 15 % ni el 7 %). La página toma el año de `EJERCICIO`, y `src/fiscal/index.js` elige qué reglas se exportan.
- [ ] Publicar la lógica como paquete npm (y portarla a Python como librería/API: FastAPI).
- [x] JSDoc con `checkJs`: `src/` pasa `npm run check` con TypeScript 7 (estricto por defecto). Queda decidir si se pasa a TypeScript.
- [ ] CI con GitHub Actions: tests en cada push.
- [x] **Web pública** (24 de noviembre de 2026): https://idruiz.com/herramientas/cuanto-facturo/, página de `idruiz-web` que usa este paquete como dependencia local (`cuanto-facturo/fiscal`, `/format` y `/textos`). La primera cuenta va en el HTML al compilar; en el navegador, la misma función `resultado()`. Botón al servicio «Presupuestador para tu web» y un evento de Umami solo con el modo. `pnpm publicar` de la web se para si este repositorio no está en `main`, limpio, subido y con los tests en verde.
- [ ] Otros países con sistema parecido (Italia: ritenuta d'acconto).

---

## Siguiente paso recomendado

Actualizado el 24 de noviembre de 2026, con la calculadora ya en idruiz.com:

1. El artículo del blog, en borrador en Ghost: lo publica David. Después, las explicaciones de la página enlazan al artículo.
2. Reglas por año (Fase 6): comprobar las de 2027 la primera semana de enero.
3. Detección por epígrafe IAE (Fase 2).
