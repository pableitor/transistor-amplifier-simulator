# Plan de Implementación: Simulador Cascada BJT de 1 o 2 Etapas

Este plan describe la arquitectura técnica, modelo matemático de acoplamiento y diseño de interfaz para expandir el simulador a un sistema **multietapa cascada de 1 o 2 etapas**. El usuario podrá habilitar una segunda etapa amplificadora y seleccionar de forma independiente la topología (CE, CC, CB) para cada etapa, visualizando el acoplamiento de señales y efectos de carga en tiempo real.

---

## User Review Required

> [!IMPORTANT]
> **Efecto de Carga AC entre Etapas**: En un sistema de 2 etapas, la impedancia de entrada de la Etapa 2 ($Z_{in,2}$) actúa como la resistencia de carga de CA de la Etapa 1 ($rc_{1,ac} = Rc_1 \parallel Z_{in,2}$). Esto significa que cambiar cualquier parámetro en la Etapa 2 (como su resistencia de base o su beta) alterará dinámicamente la ganancia y la respuesta en frecuencia de la Etapa 1. Implementaremos este acoplamiento electrónico real en el motor matemático.

> [!TIP]
> **Distribución de la Interfaz (UI) para 2 Etapas**:
> 1. **Controles de Parámetros**: Para evitar saturar la pantalla con 20 sliders, agregaremos pestañas internas en el panel izquierdo: `[ Etapa 1 ]` e `[ Etapa 2 ]`. Al pulsar una pestaña, se mostrarán los sliders correspondientes a esa etapa. La tensión de alimentación $V_{cc}$, la señal de entrada $V_{in}$, la frecuencia y la carga $Rl$ serán comunes y visibles globalmente.
> 2. **Esquema SVG**: Cuando se activen 2 etapas, mostraremos los dos esquemas SVG elegidos uno al lado del otro, conectados visualmente por un condensador de acoplamiento interetapa ($C_c$).
> 3. **Osciloscopio Dual**: Mostraremos dos pantallas de osciloscopio en el panel derecho:
>    * *Osciloscopio 1 (Etapa 1)*: Entrada global $V_{in}$ vs Salida de la Etapa 1 ($V_{out,1}$).
>    * *Osciloscopio 2 (Respuesta Global)*: Entrada global $V_{in}$ vs Salida final de la Etapa 2 ($V_{out,2}$).
> 4. **Recta de Carga**: Añadiremos un selector de pestañas `[ Recta Etapa 1 ]` y `[ Recta Etapa 2 ]` dentro del panel de la recta de carga para alternar entre el punto Q de cada transistor.
> 5. **Slider de Acoplamiento ($C_c$)**: Se añadirá un slider en el panel de parámetros de CA comunes para ajustar el valor del condensador de acoplamiento interetapa $C_c$ (con valor predeterminado de $10\ \mu\text{F}$, rango de $0.1\ \mu\text{F}$ a $100\ \mu\text{F}$).

---

## Modelo Matemático de Acoplamiento Multietapa

### 1. Polarización DC (Punto Q Independiente)
Dado que las etapas están acopladas mediante un condensador de CA ($C_c$), sus circuitos de corriente continua están completamente aislados:
* **Etapa 1**: Se calculan $Ib_1, Ic_1, Ve_1, Vc_1, Vce_1$ usando sus propios resistores ($R_{1,1}, R_{2,1}, Rc_1, Re_1$) y $\beta_1$.
* **Etapa 2**: Se calculan $Ib_2, Ic_2, Ve_2, Vc_2, Vce_2$ usando sus propios resistores ($R_{1,2}, R_{2,2}, Rc_2, Re_2$) y $\beta_2$.

### 2. Análisis AC y Acoplamiento de Impedancias
La impedancia de entrada de la segunda etapa ($Z_{in,2}$) carga dinámicamente a la primera etapa.

#### A. Parámetros de la Etapa 2 (Cargada por $Rl$)
* Resistencia dinámica: $re_2 = 25\text{ mV} / Ic_2$
* **Impedancia de Entrada ($Z_{in,2}$):**
  * *Si Etapa 2 es CE con bypass ($Ce_2$)*: $Z_{in,2} = R_{1,2} \parallel R_{2,2} \parallel (\beta_2 \cdot re_2)$
  * *Si Etapa 2 es CE sin bypass ($Ce_2$)*: $Z_{in,2} = R_{1,2} \parallel R_{2,2} \parallel [\beta_2 \cdot (re_2 + Re_2)]$
  * *Si Etapa 2 es CC*: $Z_{in,2} = R_{1,2} \parallel R_{2,2} \parallel [\beta_2 \cdot (re_2 + Re_2 \parallel Rl)]$
  * *Si Etapa 2 es CB*: $Z_{in,2} = Re_2 \parallel re_2$
* **Ganancia de Tensión de la Etapa 2 ($Av_2$):**
  * *Si Etapa 2 es CE (con bypass)*: $Av_{2,mid} = -\frac{Rc_2 \parallel Rl}{re_2}$
  * *Si Etapa 2 es CE (sin bypass)*: $Av_{2,mid} = -\frac{Rc_2 \parallel Rl}{re_2 + Re_2}$
  * *Si Etapa 2 es CC*: $Av_{2,mid} = \frac{Re_2 \parallel Rl}{re_2 + Re_2 \parallel Rl}$
  * *Si Etapa 2 es CB*: $Av_{2,mid} = \frac{Rc_2 \parallel Rl}{re_2}$

#### B. Parámetros de la Etapa 1 (Cargada por $Z_{in,2}$)
* Resistencia dinámica: $re_1 = 25\text{ mV} / Ic_1$
* **Impedancia de Entrada ($Z_{in,1}$):**
  * *Si Etapa 1 es CE con bypass ($Ce_1$)*: $Z_{in,1} = R_{1,1} \parallel R_{2,1} \parallel (\beta_1 \cdot re_1)$
  * *Si Etapa 1 es CE sin bypass ($Ce_1$)*: $Z_{in,1} = R_{1,1} \parallel R_{2,1} \parallel [\beta_1 \cdot (re_1 + Re_1)]$
  * *Si Etapa 1 es CC*: $Z_{in,1} = R_{1,1} \parallel R_{2,1} \parallel [\beta_1 \cdot (re_1 + Re_1 \parallel Z_{in,2})]$
  * *Si Etapa 1 es CB*: $Z_{in,1} = Re_1 \parallel re_1$
* **Ganancia de Tensión de la Etapa 1 ($Av_1$):**
  * Definimos la carga de colector/emisor en AC ($r_{load,1}$):
    * *Si Etapa 1 es CE o CB*: $r_{load,1} = Rc_1 \parallel Z_{in,2}$
    * *Si Etapa 1 es CC*: $r_{load,1} = Re_1 \parallel Z_{in,2}$
  * La ganancia $Av_{1,mid}$ se calcula con esta carga:
    * *Si Etapa 1 es CE (con bypass)*: $Av_{1,mid} = -\frac{r_{load,1}}{re_1}$
    * *Si Etapa 1 es CE (sin bypass)*: $Av_{1,mid} = -\frac{r_{load,1}}{re_1 + Re_1}$
    * *Si Etapa 1 es CC*: $Av_{1,mid} = \frac{r_{load,1}}{re_1 + r_{load,1}}$
    * *Si Etapa 1 es CB*: $Av_{1,mid} = \frac{r_{load,1}}{re_1}$

#### C. Ganancia Total del Sistema ($Av_{total}$)
Considerando la atenuación de entrada por la resistencia del generador $R_g = 600\  \Omega$:
$$Av_{total} = \frac{Z_{in,1}}{Rg + Z_{in,1}} \cdot Av_{1} \cdot Av_{2}$$

### 3. Respuesta en Frecuencia Completa
* **Polos de baja frecuencia ($f_L$):**
  $$f_{L1} = \frac{1}{2\pi C_1(R_g + Z_{in,1})} \quad (\text{Polo de Entrada})$$
  $$f_{L2} = \frac{1}{2\pi C_2(R_{out,2} + Rl)} \quad (\text{Polo de Salida})$$
  $$f_{L,c} = \frac{1}{2\pi C_c(R_{out,1} + Z_{in,2})} \quad (\text{Polo de Acoplamiento Interetapa})$$
  $$f_{Le1}, f_{Le2} \quad (\text{Polos de bypass de emisor/base para cada etapa})$$
  $$f_L = \sqrt{f_{L1}^2 + f_{L2}^2 + f_{L,c}^2 + f_{Le1}^2 + f_{Le2}^2}$$
  *Donde $R_{out,1}$ es $Rc_1$ (para CE/CB) o $Re_1 \parallel \left(re_1 + \frac{R_{th1} \parallel Rg}{\beta_1}\right)$ (para CC).*
  *Donde $R_{out,2}$ es $Rc_2$ (para CE/CB) o $Re_2 \parallel \left(re_2 + \frac{R_{th2} \parallel R_{out,1}}{\beta_2}\right)$ (para CC).*

* **Polos de alta frecuencia ($f_H$):**
  El límite superior de frecuencia de banda media se determina modelando individualmente el polo de cada transistor. La frecuencia $f_H$ total del sistema se aproximará considerando el efecto dominante del polo más bajo.

### 4. Límites de Recorte (Clipping) Dinámicos
* **Etapa 1**: Recorta su tensión de salida según sus límites propios ($V_{cc}$ y $Ve_1 + V_{CE,sat}$). La señal recortada ingresa directamente a la Etapa 2.
* **Etapa 2**: Recorta la señal amplificada final de acuerdo con sus propios límites ($V_{cc}$ y $Ve_2 + V_{CE,sat}$). Esto simulará perfectamente la distorsión en cascada (donde la primera etapa puede recortar la señal antes de que la segunda la vuelva a amplificar o recortar).

---

## Propuesta de Cambios en los Archivos

### 1. [index.html](file:///C:/Users/ptorr/OneDrive/Documentos/JAVASCRIPT/transistor-amplifier-simulator/index.html)
* **Selector de Etapas**: Agregar un botón selector en el header: `[ 1 Etapa ]` e `[ 2 Etapas ]`.
* **Pestañas de Control**: Agregar botones de pestañas en el panel de parámetros: `[ Etapa 1 ]` e `[ Etapa 2 ]` para conmutar los conjuntos de sliders.
* **Duplicar Sliders**: Duplicar los sliders de parámetros DC ($R_1, R_2, Rc, Re, \beta, Ce$) asignándoles IDs diferenciados (`param-r1-2`, `param-r2-2`, etc.) y agruparlos en un contenedor que se ocultará/mostrará mediante CSS.
* **Slider de $C_c$**: Agregar un slider de acoplamiento de CA en el panel común para regular la capacidad de $C_c$ ($10\ \mu\text{F}$ por defecto).
* **Esquemas SVG**: Crear un contenedor responsivo que pueda albergar dos diagramas SVG contiguos de menor tamaño conectados por un gráfico de condensador $C_c$.
* **Segundo Canvas de Osciloscopio**: Añadir `<canvas id="canvas-oscilloscope-2" ...>` al panel de gráficos.

### 2. [style.css](file:///C:/Users/ptorr/OneDrive/Documentos/JAVASCRIPT/transistor-amplifier-simulator/style.css)
* Clases y estilos de maquetación para organizar los sliders en sub-pestañas.
* Soporte flexbox/grid para posicionar dos SVG lado a lado de forma responsiva.
* Soporte para mostrar dos pantallas de osciloscopio apiladas o una al lado de la otra en pantallas anchas.

### 3. [app.js](file:///C:/Users/ptorr/OneDrive/Documentos/JAVASCRIPT/transistor-amplifier-simulator/app.js)
* **Estado global**: `numStages = 1` (o 2). Agregar variables de estado para la topología de la Etapa 1 y la Etapa 2 (`activeConfig1`, `activeConfig2`).
* **Motor matemático**: Reescribir `runBjtSimulation()` para calcular secuencialmente la Etapa 2, obtener su impedancia de entrada $Z_{in,2}$, aplicar esta impedancia como carga a la Etapa 1, y calcular la respuesta total.
* **Osciloscopio**: Renderizar las formas de onda en ambos canvas. El segundo osciloscopio dibujará la señal global $V_{in}$ vs $V_{out,2}$.
* **Recta de Carga**: Dibujar la recta y punto Q de la etapa seleccionada mediante un conmutador visual.

---

## Plan de Verificación

1. **Verificación de Efecto de Carga**:
   * Activar 2 Etapas.
   * Con la Etapa 1 en CE, disminuir drásticamente $R_{1,2}$ y $R_{2,2}$ en la Etapa 2 (lo que reduce la impedancia de entrada $Z_{in,2}$).
   * Verificar que la ganancia $Av_1$ de la primera etapa disminuya de forma correspondiente en las lecturas, demostrando el acoplamiento físico real.
2. **Verificación de Fase en Cascada**:
   * Configurar `CE` + `CE`: El desfase total debe ser de $360^\circ$ ($0^\circ$), por lo que la salida final estará en fase con la entrada global.
   * Configurar `CE` + `CC`: El desfase total debe ser de $180^\circ$ (señal final invertida).
3. **Verificación de Clipping en Cascada**:
   * Incrementar $V_{in}$ hasta que el primer osciloscopio muestre recorte en $V_{out,1}$.
   * Verificar que la señal en el segundo osciloscopio entre ya recortada y se amplifique con esa deformación, demostrando distorsión en cascada realista.
