# Origen del proyecto

Resumen de la idea que dio origen a **¿Cuánto facturo?** y de la conversación en la que se fue construyendo (18–20 de noviembre de 2026).

## La pregunta de partida

> «Quiero 100 € limpios para mí. ¿Cuánto tengo que facturar?»

Era una conversación anterior con otra IA. Respondió con dos casos (100 € después de apartar el IVA y 100 € de beneficio real). Al revisarla salieron varios problemas:

- **Las cuentas estaban bien.** Base de 107,53 €, IVA de 22,58 €, retención de 7,53 € y factura de 122,58 €.
- **Daba por hecho el 7 % de retención** sin comprobar si correspondía. El general es el 15 %, y solo retienen los profesionales (secciones 2ª y 3ª del IAE) cuando el cliente es empresa o autónomo.
- **Trataba la retención como dinero perdido.** En realidad es un adelanto del IRPF.
- **El "beneficio real" usaba cifras inventadas**: un 33 % de IRPF, poco realista para esos ingresos.
- **Cerraba con un aviso sobre criptomonedas** que no venía a cuento.
- **No hablaba del modelo 130** ni de las reducciones del IRPF para autónomos que empiezan.

## IAE y CNAE

El IAE es el código fiscal; dice a Hacienda si eres profesional o empresarial y, por tanto, si retienes. El CNAE es estadístico; lo usa la Seguridad Social (para el tipo por contingencias profesionales) y Hacienda también lo pide en el 036. El CNAE **no** cambia el IRPF ni la cuota de autónomos.

## Lo que se fue aclarando

### 1. Depende de a quién le cobres

| Cliente | IVA | Retención |
|---|---|---|
| Empresa o autónomo en España | 21 % | 7 % / 15 % |
| Particular en España | 21 % | No |
| Empresa de la UE (VIES + ROI) | No: inversión del sujeto pasivo | No |
| Empresa fuera de la UE | No: no sujeta | No |

### 2. La fórmula (y el error típico)

Para que te queden X €:

```
Base = X ÷ (1 − retención)      → con el 7 %: X ÷ 0,93
```

El **0,93** es la parte de la base que te llega: el 100 % menos el 7 % de retención.

Error típico: sumar el 7 % a X (100 + 7 = 107). Como la retención se calcula sobre la base y no sobre X, te quedarían 99,51 €.

Para 100 € limpios:

| Cliente | Base | Total factura |
|---|---|---|
| Empresa o autónomo en España | 107,53 € | 122,58 € |
| Particular en España | 100 € | 121 € |
| Empresa de la UE / fuera de la UE | 100 € | 100 € |

### 3. Qué es la retención

El cliente te descuenta la retención y la ingresa en Hacienda a tu nombre (en su modelo 111). Es **tu** IRPF, adelantado con **tu** dinero. No te lo cobran dos veces.

### 4. La declaración de la renta

Cada año (de abril a junio, en el modelo 100) se calcula el IRPF real sobre el **beneficio**: ingresos − gastos − cuota de autónomos − reducciones.

```
IRPF calculado − retenciones − pagos del modelo 130 = a pagar (+) o a devolver (−)
```

El IRPF va por tramos. En Extremadura, aproximadamente: 18 % hasta 12.450 €, 24 % hasta 20.200 €, 30 % hasta 35.200 €… Los primeros 5.550 € (mínimo personal) no tributan.

Ejemplo: con 15.000 € de beneficio, el IRPF sale por unos 1.850 € (≈12 %). Con 20.000 € de base facturada al 7 % te habrían retenido 1.400 €, así que en la renta pagarías unos 450 €.

### 5. Beneficio real (pendiente)

Con 1.500 € al mes de facturación y 500 € de gastos, de cada 100 € de base quedan entre 47 y 59 € de beneficio real, según la cuota de autónomos. Para ganar 100 € "de verdad" hay que facturar una base de **unos 170–210 €**.

Se aparcó a propósito: la v1 calcula solo IVA y retención. El beneficio real es la **Fase 3** del [plan](PLAN.md).

## La idea del producto

> Que un autónomo no tenga que pensar: solo dice lo que quiere en el bolsillo y basta.

- Con **IAE + fecha de alta** se sabe la retención de cada factura.
- **No** se sabe el IRPF final: depende del beneficio anual y de la situación personal. Eso queda para más adelante.

## Cómo se construyó

1. **v1, artefacto de claude.ai en un solo archivo.** Copia en `legacy/v1-artefacto.html`.
2. **v0.2, este proyecto:** lógica fiscal separada de la interfaz, reglas de 2026 como datos y tests con los casos de arriba.
3. **v0.3 (23 de noviembre de 2026):** en git desde ese día. Avisa si la factura es anterior al alta, 16 tests, tipos comprobados, estilo de la marca IDRuiz sin recursos externos y sin fecha de alta por defecto. Se decide que **no generará facturas** (Verifactu): ver [PLAN.md](PLAN.md).
4. **Siguiente:** ver [PLAN.md](PLAN.md).

## Fuentes consultadas

- Art. 101.5 LIRPF y art. 95 RIRPF: retención del 15 % y del 7 % para nuevos profesionales.
- Art. 109.2 RIRPF: exención del modelo 130 si al menos el 70 % de los ingresos llevan retención.
- Art. 32.2.3 y 32.3 LIRPF: reducción por rentas bajas y del 20 % por inicio de actividad.
- Tablas de cotización de autónomos de 2025, prorrogadas para 2026.
- Correspondencia orientativa IAE ↔ CNAE-2025 de la AEAT.
- Cuadro de tipos de retención del IRPF de 2026 de la AEAT (el vigente desde el 10 de septiembre): 15 % y 7 % sin cambios. Comprobado el 23 de noviembre de 2026.

*Cálculos orientativos. No sustituyen a una asesoría.*
