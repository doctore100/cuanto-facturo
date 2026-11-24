# ¿Cuánto facturo?

Calculadora para autónomos de España, en lenguaje de la calle. Responde a una sola pregunta:
**«quiero ganar X, ¿qué precio pongo?»**. O al revés: «si pongo este precio, o si me pagan esto,
¿cuánto me queda?».

Enseña siempre los cuatro tipos de cliente a la vez, en cuatro tarjetas:

| Cliente | IVA | Retención de IRPF |
|---|---|---|
| Empresa o autónomo de España | Sí | Sí, si das un servicio (actividad profesional) |
| Persona de España | Sí | No |
| Empresa de otro país de Europa | No (inversión del sujeto pasivo; hace falta el ROI) | No |
| Empresa de fuera de Europa | No (no sujeta) | No |

La retención sale de dos preguntas, sin escribir ninguna fecha:
- **¿A qué te dedicas?** Con un servicio (secciones 2ª y 3ª del IAE) hay retención; con un negocio
  (sección 1ª), no.
- **¿Cuándo te diste de alta?** «Antes de (año − 2), o no lo sé»: 15 %. «En (año − 2), (año − 1) o
  (año)»: 7 %, que vale el año del alta y los dos siguientes. Los años salen de la fecha de hoy.
  Se puede elegir el 15 % aunque toque el 7 %.

Las cuentas, al céntimo, como en una factura real:

```
Precio = X ÷ (1 − retención)      → con el 15 %: 100 ÷ 0,85 = 117,65 €
IVA    = Precio × 21 %            → 24,71 €
Pago   = Precio + IVA − retención → 124,71 €
Para ti = Pago − IVA = X          → 100,00 €
```

Desde el pago, busca el precio con el que el pago sale más cerca. No todos los pagos son posibles
(el IVA y la retención se redondean cada uno por su lado), y entonces la tarjeta lo dice.

Normas de 2026, territorio común. Orientativa: no sustituye a una asesoría fiscal.

## Qué no hace

**No genera facturas** (decidido el 23 de noviembre de 2026). Dice qué precio poner; la factura la
hace cada uno con su programa o su asesoría. Así no es un sistema informático de facturación y no
le afecta Verifactu (RD 1007/2023). Detalle en [`docs/PLAN.md`](docs/PLAN.md).

Tampoco calcula el beneficio real (gastos, cuota de autónomos, IRPF final), ni los casos de la
fase 4 del plan: módulos (1 %), agricultura y ganadería (2 %), Canarias, Ceuta y Melilla.

**No guarda nada:** ni cookies ni `localStorage`. Lo que se escribe no sale del navegador.

## Arrancar

No tiene dependencias. Usa módulos ES, así que hay que abrirlo con un servidor, no con doble clic:

- **WebStorm:** clic derecho en `index.html` → *Open In → Browser* (usa el servidor integrado).
- **Terminal:** `npm run dev` y abre http://localhost:5173 (solo escucha en este equipo y le dice
  al navegador que no guarde copias).

## Comprobar

```
npm test         # tests con el runner nativo de Node (node --test), sin instalar nada
npm run check    # tipos de src/ con TypeScript (necesita tsc instalado; no es dependencia)
```

## Usarla desde otra web

`idruiz-web` la usa para `idruiz.com/herramientas/cuanto-facturo/`, como dependencia local
(`"cuanto-facturo": "link:../cuanto-facturo"`). Dos puertas de entrada (`exports` de `package.json`):

```js
import { CLIENTES, facturaParaNeto, facturaDesdePago } from "cuanto-facturo/fiscal";
import { euros, leerImporte } from "cuanto-facturo/format";
```

TypeScript lee los tipos del JSDoc; no hace falta un `.d.ts`. La web publica lo que haya en esta
carpeta al compilar: antes de publicarla, esta carpeta tiene que estar en `main`, sin cambios y con
los tests en verde.

## Estructura

```
index.html                  La página (variante C): preguntas, tarjetas y explicaciones
favicon.svg                 Icono de la marca (copia del de idruiz-web)
src/
  main.js                   Lee las preguntas y rellena las tarjetas (solo textos; las cuentas, en fiscal/)
  format.js                 Euros, porcentajes, fechas y leerImporte («1.000,50» → 1000,5)
  styles.css                Estilos de la marca IDRuiz
  fonts/                    Montserrat variable (juego latino) y su licencia OFL
  fiscal/
    index.js                Puerta de entrada: reglas y cálculo (cuanto-facturo/fiscal)
    reglas-2026.js          Lo que cambia cada año, como datos: tipos, clientes, actividades
    calculo.js              Lógica pura: precio para ganar X, al revés, retención, años del alta
tests/
  calculo.test.js           Casos comprobados a mano, el cálculo al revés y la pregunta del alta
  format.test.js            Importes escritos a la española
scripts/
  servir.py                 Servidor local de npm run dev, sin copias del navegador
legacy/
  v1-artefacto.html         Primera versión, en un solo archivo
docs/
  ORIGEN.md                 De dónde salió la idea y qué se aclaró
  PLAN.md                   Plan de ampliación y lo que queda fuera
```

El prototipo con el que se eligió el diseño (variantes A, B, C y D) está en la rama
`prototipo/lenguaje-sencillo`.

**Regla de oro:** la lógica fiscal (`src/fiscal/`) no toca el DOM. Todo lo que cambie por ley va en
`reglas-AAAA.js` como datos, no en el código.

## Estilo

El de la marca IDRuiz, igual que `idruiz.com` (`idruiz-web/src/styles/global.css`): fondo azul noche,
Montserrat ligera (200 en los títulos y las cifras grandes, 300 en el texto), trazo fino, turquesa
para lo que importa y tarjetas sin sombra con borde blanco al 10 %. Solo tema oscuro, como la web.

**No carga nada de fuera:** la fuente va en `src/fonts/` y la flecha del desplegable está dibujada
en el CSS. Es lo que dice la revisión legal de la web («tipografías locales y ningún recurso
externo»).

**Accesible:** las preguntas de opciones son grupos con su pregunta (`fieldset` y `legend`), las
opciones se pulsan enteras, todo lo que se alcanza con el tabulador enseña el foco y el lector de
pantalla lee el aviso de la retención cuando cambia.
