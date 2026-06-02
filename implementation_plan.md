# Plan de Implementación: Simulador Multitopología BJT (CE, CC, CB)

Este plan de implementación detalla la arquitectura, el diseño de la interfaz y, de manera rigurosa, el **modelo matemático de corriente continua (DC) y corriente alterna (AC) de pequeña señal** para las tres configuraciones de amplificadores con transistores bipolares NPN ($Q_1$):
1. **Emisor Común (CE - Common Emitter)**
2. **Colector Común / Seguidor de Emisor (CC - Common Collector / Emitter Follower)**
3. **Base Común (CB - Common Base)**

El simulador se basa en un motor matemático en tiempo real que modela la respuesta del circuito dinámicamente según los parámetros configurados con los controles deslizantes (sliders).

---

## User Review Required

> [!IMPORTANT]
> Para soportar las tres configuraciones de forma limpia y responsiva, implementaremos **tres esquemas vectoriales SVG de alta definición independientes e incrustados** en `index.html`. Usaremos CSS para mostrar el esquema de la configuración activa y ocultar los demás (`display: block` vs `display: none`). Esto garantizará una transición fluida y mantendrá el resaltado dinámico de componentes en cada circuito al pasar el cursor sobre los sliders de control.
>
> Recomiendo encarecidamente que mantengamos el proyecto en el subdirectorio activo:
> `C:\Users\ptorr\.gemini\antigravity\scratch\transistor-amplifier-simulator`
> Una vez aprobado este plan, mantendremos sincronizados los archivos de la simulación.

---

## Modelos Matemáticos Completos y Nomenclatura del Circuito

A continuación se presentan las ecuaciones exactas que rigen la simulación en tiempo real. Todas las ecuaciones emplean de forma estricta la nomenclatura de los componentes visualizados en los esquemas interactivos de la aplicación:

* **$V_{cc}$**: Tensión de alimentación de CC (raíl superior de alimentación).
* **$R_1$**: Resistencia superior del divisor de tensión de base.
* **$R_2$**: Resistencia inferior del divisor de tensión de base.
* **$Rc$**: Resistencia de colector (no presente en la topología CC, donde el colector se conecta directamente a $V_{cc}$).
* **$Re$**: Resistencia de emisor conectada entre el emisor del transistor y tierra (GND).
* **$Rl$**: Resistencia de carga externa acoplada en CA.
* **$Q_1$**: Transistor BJT NPN, caracterizado por su ganancia de corriente beta ($\beta$ o $h_{fe}$).
* **$C_1$**: Condensador de acoplamiento de entrada.
* **$C_2$**: Condensador de acoplamiento de salida.
* **$Ce$**: Condensador de derivación (bypass) de emisor (exclusivo de CE).
* **$Cb$**: Condensador de derivación (bypass) de base a tierra (exclusivo de CB, etiquetado como `Cb`).
* **$R_g$**: Resistencia interna del generador de señal de CA ($R_g = 600\ \Omega$).
* **$V_{in}$**: Voltaje pico de la señal de entrada de CA.
* **$f$**: Frecuencia de la señal de entrada.

```mermaid
graph TD
    classDef ce fill:#ff007f,stroke:#ff007f,stroke-width:1px,color:#fff;
    classDef cc fill:#00f2fe,stroke:#00f2fe,stroke-width:1px,color:#111;
    classDef cb fill:#ffb700,stroke:#ffb700,stroke-width:1px,color:#111;

    Selector[Selector de Configuración] --> CE[Emisor Común (CE)]:::ce
    Selector --> CC[Colector Común (CC)]:::cc
    Selector --> CB[Base Común (CB)]:::cb

    CE --> CE_Eq[Entrada: Base / Salida: Colector<br>Ganancia Av Alta e Invertida -180°<br>Impedancia Zin Moderada]:::ce
    CC --> CC_Eq[Entrada: Base / Salida: Emisor<br>Ganancia Av ≈ 1 En Fase<br>Impedancia Zin Muy Alta]:::cc
    CB --> CB_Eq[Entrada: Emisor / Salida: Colector<br>Ganancia Av Alta En Fase<br>Impedancia Zin Muy Baja]:::cb
```

---

### 1. Polarización y Punto Q en Corriente Continua (DC)

Para las tres topologías, la base de $Q_1$ se polariza mediante un divisor de tensión formado por $R_1$ y $R_2$. El punto de operación en reposo (punto Q) se calcula de la siguiente manera:

#### A. Equivalente de Thévenin en la Base
* **Tensión de Thévenin ($V_{th}$):**
  $$V_{th} = V_{cc} \cdot \frac{R_2}{R_1 + R_2}$$
* **Resistencia de Thévenin ($R_{th}$):**
  $$R_{th} = R_1 \parallel R_2 = \frac{R_1 \cdot R_2}{R_1 + R_2}$$

#### B. Corrientes y Voltajes en Región Activa
Si $V_{th} > V_{BE}$ (donde $V_{BE} = 0.7\text{ V}$ para el transistor de silicio $Q_1$):
* **Corriente de base en reposo ($Ib$):**
  $$Ib = \frac{V_{th} - V_{BE}}{R_{th} + (\beta + 1) \cdot Re}$$
* **Corriente de colector en reposo ($Ic$):**
  $$Ic = \beta \cdot Ib$$
* **Corriente de emisor en reposo ($Ie$):**
  $$Ie = (\beta + 1) \cdot Ib$$
* **Voltaje de emisor en reposo ($Ve$):**
  $$Ve = Ie \cdot Re$$

* **Voltaje de colector en reposo ($Vc$):**
  * **Emisor Común (CE) y Base Común (CB):** El colector se conecta a través de $Rc$.
    $$Vc = V_{cc} - Ic \cdot Rc$$
  * **Colector Común (CC):** El colector se conecta directamente a la alimentación $V_{cc}$.
    $$Vc = V_{cc}$$

* **Voltaje colector-emisor en reposo ($Vce$):**
  $$Vce = Vc - Ve$$

Si $V_{th} \le V_{BE}$, el transistor $Q_1$ se encuentra en estado de **CORTE** y se modela con:
$$Ib = 0,\quad Ic = 0,\quad Ie = 0,\quad Ve = 0,\quad Vc = V_{cc}\text{ (en CE y CB)},\quad Vce = V_{cc}$$

#### C. Condición y Valores de Saturación
Si el voltaje calculado $Vce$ cae por debajo de la barrera de saturación del transistor ($V_{CE,sat} = 0.2\text{ V}$), el transistor entra en la región de **SATURACIÓN**, por lo que se recalculan los valores del punto Q:
* **Para Emisor Común (CE) y Base Común (CB) [Circuitos con Rc y Re]:**
  $$Ic = Ie = \frac{V_{cc} - V_{CE,sat}}{Rc + Re}$$
  $$Ib = \frac{Ic}{\beta}$$
  $$Ve = Ie \cdot Re$$
  $$Vc = Ve + V_{CE,sat}$$
  $$Vce = V_{CE,sat} = 0.2\text{ V}$$
* **Para Colector Común (CC) [Circuito con Re, Colector a Vcc]:**
  $$Ie = Ic = \frac{V_{cc} - V_{CE,sat}}{Re}$$
  $$Ib = \frac{Ie}{\beta}$$
  $$Ve = Ie \cdot Re = V_{cc} - V_{CE,sat}$$
  $$Vc = V_{cc}$$
  $$Vce = V_{CE,sat} = 0.2\text{ V}$$

---

### 2. Análisis Dinámico en Corriente Alterna (AC) de Pequeña Señal

En la zona de operación activa, se define la **resistencia dinámica intrínseca del emisor ($re$)** en base al voltaje térmico ($V_T = 25\text{ mV}$):
$$re = \frac{V_T}{Ic}$$

#### A. Configuración de Emisor Común (CE)
* **Resistencia de colector de CA ($rc_{ac}$):**
  $$rc_{ac} = Rc \parallel Rl = \frac{Rc \cdot Rl}{Rc + Rl}$$
* **Impedancia de entrada ($Z_{in}$):**
  * **Con Condensador de Bypass ($Ce$ activo):**
    $$Z_{in} = R_1 \parallel R_2 \parallel (\beta \cdot re) = R_{th} \parallel (\beta \cdot re)$$
  * **Sin Condensador de Bypass ($Ce$ inactivo):**
    $$Z_{in} = R_1 \parallel R_2 \parallel [\beta \cdot (re + Re)] = R_{th} \parallel [\beta \cdot (re + Re)]$$
* **Ganancia de Tensión de Banda Media ($Av_{mid}$):**
  * **Con Condensador de Bypass ($Ce$ activo):**
    $$Av_{mid} = -\frac{rc_{ac}}{re}$$
    *(Desfase de $180^\circ$, señal invertida)*
  * **Sin Condensador de Bypass ($Ce$ inactivo):**
    $$Av_{mid} = -\frac{rc_{ac}}{re + Re}$$
    *(Desfase de $180^\circ$, señal invertida)*

#### B. Configuración de Colector Común (CC - Seguidor de Emisor)
* **Resistencia de emisor de CA ($re_{ac}$):**
  $$re_{ac} = Re \parallel Rl = \frac{Re \cdot Rl}{Re + Rl}$$
* **Impedancia de entrada ($Z_{in}$):**
  $$Z_{in} = R_1 \parallel R_2 \parallel [\beta \cdot (re + re_{ac})] = R_{th} \parallel [\beta \cdot (re + re_{ac})]$$
  *(Impedancia extremadamente alta, $>100\text{ k}\Omega$)*
* **Ganancia de Tensión de Banda Media ($Av_{mid}$):**
  $$Av_{mid} = \frac{re_{ac}}{re + re_{ac}}$$
  *(Ganancia positiva en fase, ligeramente menor que 1, $\approx 0.95 - 0.99$)*

#### C. Configuración de Base Común (CB)
* **Resistencia de colector de CA ($rc_{ac}$):**
  $$rc_{ac} = Rc \parallel Rl = \frac{Rc \cdot Rl}{Rc + Rl}$$
* **Impedancia de entrada ($Z_{in}$):**
  La señal de entrada se inyecta directamente por el emisor del transistor $Q_1$:
  $$Z_{in} = Re \parallel re = \frac{Re \cdot re}{Re + re}$$
  *(Impedancia sumamente baja, típicamente de unos pocos ohmios: $5\ \Omega$ a $50\ \Omega$)*
* **Ganancia de Tensión de Banda Media ($Av_{mid}$):**
  $$Av_{mid} = \frac{rc_{ac}}{re}$$
  *(Ganancia alta y en fase, idéntica en magnitud a CE con bypass, pero sin inversión de fase)*

---

### 3. Respuesta en Frecuencia y Modelado de Polos

El comportamiento en frecuencia del amplificador se modela mediante polos de baja y alta frecuencia para simular el ancho de banda real:

#### A. Frecuencia de Corte de Baja Frecuencia ($f_L$) - Filtro Pasa Altos
Está determinada por los acoplamientos capacitivos y de bypass:

1. **Polo de entrada ($f_{L1}$):** Depende de la impedancia de entrada y de la resistencia del generador $R_g$ ($600\ \Omega$):
   $$f_{L1} = \frac{1}{2\pi \cdot C_1 \cdot (R_g + Z_{in})}$$
2. **Polo de salida ($f_{L2}$):**
   * **CE y CB:**
     $$f_{L2} = \frac{1}{2\pi \cdot C_2 \cdot (Rc + Rl)}$$
   * **CC:**
     $$f_{L2} = \frac{1}{2\pi \cdot C_2 \cdot (R_{eq,e,ac} + Rl)}, \quad \text{donde } R_{eq,e,ac} = Re \parallel \left(re + \frac{R_{th} \parallel R_g}{\beta}\right)$$
3. **Polo de derivación / Bypass ($f_{Le}$):**
   * **CE (con $Ce$ activo):**
     $$f_{Le} = \frac{1}{2\pi \cdot C_e \cdot R_{eq,e}}, \quad \text{donde } R_{eq,e} = Re \parallel \left(re + \frac{R_{th} \parallel R_g}{\beta}\right)$$
     *(Si $Ce$ está inactivo, $f_{Le} = 0$)*
   * **CC:** No aplica condensador de bypass ($f_{Le} = 0$).
   * **CB (con condensador de bypass de base $Cb$):**
     $$f_{Le} = \frac{1}{2\pi \cdot C_b \cdot R_{eq,b}}, \quad \text{donde } R_{eq,b} = \frac{R_{th}}{\beta + 1}$$
4. **Frecuencia de corte inferior total ($f_L$):**
   $$f_L = \sqrt{f_{L1}^2 + f_{L2}^2 + f_{Le}^2}$$

#### B. Frecuencia de Corte de Alta Frecuencia ($f_H$) - Filtro Pasa Bajos
Se calcula a partir de las capacitancias internas del transistor NPN ($C_{be} = 25\text{ pF}$, $C_{bc} = 5\text{ pF}$):

1. **Emisor Común (CE) y Colector Común (CC):** Sufren el **Efecto Miller** en la capacitancia de entrada:
   * **Capacitancia Miller ($C_M$):**
     $$C_M = C_{bc} \cdot (1 + |Av_{mid}|)$$
   * **Capacitancia de entrada total ($C_{in,H}$):**
     $$C_{in,H} = C_{be} + C_M$$
   * **Resistencia equivalente de entrada ($R_{eq,H}$):**
     $$R_{eq,H} = R_g \parallel R_{th} = \frac{R_g \cdot R_{th}}{R_g + R_{th}}$$
   * **Frecuencia de corte superior ($f_H$):**
     $$f_H = \frac{1}{2\pi \cdot R_{eq,H} \cdot C_{in,H}}$$
2. **Base Común (CB):** La base se conecta dinámicamente a tierra a través de $Cb$, por lo que el **Efecto Miller es nulo** ($C_M \approx 0$). Esto elimina la realimentación capacitiva de colector a base:
   * **Capacitancia de entrada total ($C_{in,H}$):**
     $$C_{in,H} = C_{be}$$
   * **Resistencia equivalente de entrada ($R_{eq,H}$):**
     $$R_{eq,H} = R_g \parallel Z_{in} \approx Z_{in}\text{ (ya que } Z_{in} \ll R_g\text{)}$$
   * **Frecuencia de corte superior ($f_H$):**
     $$f_H = \frac{1}{2\pi \cdot R_{eq,H} \cdot C_{in,H}}$$

#### C. Ganancia Final de CA y Desfase Dinámico
* **Factor de atenuación por frecuencia:**
  $$A(f) = \frac{1}{\sqrt{1 + \left(\frac{f}{f_H}\right)^2}} \cdot \frac{1}{\sqrt{1 + \left(\frac{f_L}{f}\right)^2}}$$
* **Ganancia de voltaje final calculada ($Av$):**
  $$Av = Av_{mid} \cdot A(f)$$
* **Ángulo de fase dinámico en grados ($\phi$):**
  $$\phi_L = \arctan\left(\frac{f_L}{f}\right), \quad \phi_H = -\arctan\left(\frac{f}{f_H}\right)$$
  $$\phi_{\text{total}} = (\phi_L + \phi_H) \cdot \frac{180^\circ}{\pi}$$
  *(Si la topología es CE, se suma un desfase de $180^\circ$ debido al signo negativo de la ganancia)*

---

### 4. Límites de Oscilación y Simulación de Recorte (Clipping)

El voltaje instantáneo de salida se recorta de forma realista basándose en los límites físicos dinámicos de cada topología y el punto Q correspondiente:

* **Configuración de Emisor Común (CE):**
  La señal de salida se toma en el colector ($Vc$). El voltaje dinámico de colector $v_c(t)$ está limitado por:
  * **Saturación (Límite Inferior):**
    $$v_c(t)_{\min} = Ve + V_{CE,sat} = Ve + 0.2\text{ V}$$
  * **Corte (Límite Superior):**
    $$v_c(t)_{\max} = V_{cc}$$
  * Si la señal de salida teórica supera estos límites, se produce un recorte plano de onda (clipping) arriba ($V_{cc}$) e inferior ($Ve + 0.2\text{ V}$).

* **Configuración de Colector Común (CC):**
  La señal de salida se toma en el emisor ($Ve$). El voltaje dinámico de emisor $v_e(t)$ está acotado por:
  * **Corte (Límite Inferior):**
    $$v_e(t)_{\min} = 0\text{ V}$$
  * **Saturación (Límite Superior):**
    $$v_e(t)_{\max} = V_{cc} - V_{CE,sat} = V_{cc} - 0.2\text{ V}$$

* **Configuración de Base Común (CB):**
  La señal de salida se toma en el colector ($Vc$). El voltaje dinámico de colector $v_c(t)$ está limitado por:
  * **Saturación (Límite Inferior):**
    $$v_c(t)_{\min} = V_b = Ve + V_{BE} = Ve + 0.7\text{ V}$$
    *(El transistor satura cuando el colector cae por debajo del potencial de base)*
  * **Corte (Límite Superior):**
    $$v_c(t)_{\max} = V_{cc}$$

---

## Propuesta de Cambios en los Archivos

### 1. `[MODIFY]` [index.html](file:///C:/Users/ptorr/..gemini/antigravity/scratch/transistor-amplifier-simulator/index.html)
* **Selector de Topología**: Añadiremos un control visual de pestañas fluorescentes en el encabezado: "Emisor Común", "Colector Común", "Base Común".
* **Esquemas SVG triplicados**:
  * `svg-ce`: Esquema tradicional de Emisor Común.
  * `svg-cc`: Esquema de Colector Común (colector directo a $V_{cc}$, salida en el emisor, sin condensador $Ce$).
  * `svg-cb`: Esquema de Base Común (base puenteada a tierra mediante condensador de bypass de base $Cb$, entrada en emisor, salida en colector).
* **Modificación de Sliders**: Algunos sliders se desactivarán visualmente si no aplican a la topología activa (por ejemplo, el interruptor de $Ce$ no aplica en Colector Común).

### 2. `[MODIFY]` [style.css](file:///C:/Users/ptorr/..gemini/antigravity/scratch/transistor-amplifier-simulator/style.css)
* Clases CSS para ocultar/mostrar los esquemas activos:
  ```css
  .schematic-wrapper svg { display: none; }
  .schematic-wrapper svg.active { display: block; }
  ```
* Estilo visual para las pestañas de selección de topología en el encabezado (efecto brillante neon).
* Estilos para controles desactivados (opacidad reducida e interactividad bloqueada).

### 3. `[MODIFY]` [app.js](file:///C:/Users/ptorr/..gemini/antigravity/scratch/transistor-amplifier-simulator/app.js)
* **Variable de Estado**: `activeConfig = 'CE'` (o 'CC', 'CB').
* **Ecuaciones Dinámicas**: Reemplazar la sección de pequeña señal con una estructura `switch(activeConfig)` que aplique las fórmulas del modelo matemático descritas arriba.
* **Trazado de Señales**: Adaptar la ecuación de salida del osciloscopio y aplicar los límites dinámicos de recorte (clipping).

---

## Plan de Verificación

1. **Prueba de Transición de Esquemas**: Al pulsar "Colector Común" o "Base Común", el esquema SVG interactivo debe cambiar instantáneamente al circuito respectivo e iluminar sus componentes al pasar el ratón sobre los sliders correspondientes.
2. **Prueba de Ganancia en Colector Común**:
   * En CC, verificar que la ganancia visualizada ($Av$) sea positiva (por ejemplo: `+0.98x`), que la señal en el osciloscopio esté perfectamente en fase con la entrada y que la impedancia de entrada calculada sea sumamente elevada ($Z_{in} > 100\text{ k}\Omega$).
3. **Prueba de Impedancia en Base Común**:
   * En CB, verificar que la impedancia de entrada $Z_{in}$ caiga a valores extremadamente bajos (entre $5\ \Omega$ y $50\ \Omega$), mientras que la ganancia $Av$ sea muy alta y positiva (sin inversión de fase).
4. **Verificación de Presets Inteligentes**:
   * Los preajustes rápidos de la parte superior se adaptarán a la topología activa para proporcionar simulaciones educativas instantáneas sin distorsión o con distorsión selectiva.
