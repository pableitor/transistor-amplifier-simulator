# BJT Amplifier Playground ⚡

Un simulador web interactivo de alto rendimiento en tiempo real para amplificadores de transistores bipolares NPN ($Q_1$, $Q_2$), diseñado bajo una estética premium *Cyberpunk-Dark / Glassmorphism*. La aplicación permite simular sistemas amplificadores de **1 o 2 etapas en cascada**, posibilitando la selección independiente de la topología (CE, CC, CB) y la configuración de componentes para cada etapa en tiempo real. 

El simulador modela con rigor físico y en tiempo real el acoplamiento de señales por condensador, los efectos de carga entre etapas, la respuesta en frecuencia completa y el clipping acumulado en cascada.

---

## 🚀 Características Clave
* **Estructura Modular Cascaded**: Alterna dinámicamente entre 1 o 2 etapas con un solo clic en el encabezado.
* **Topologías Independientes por Etapa**: Configura de forma independiente cada etapa en cualquiera de las tres configuraciones BJT clásicas:
  1. **Emisor Común (CE)**: Alta ganancia de tensión e inversión de fase (180°).
  2. **Colector Común / Seguidor de Emisor (CC)**: Ganancia de voltaje unitaria en fase, alta impedancia de entrada y baja de salida.
  3. **Base Común (CB)**: Alta ganancia de tensión en fase y baja impedancia de entrada.
* **Acoplamiento AC Dinámico y Efecto de Carga**: En el modo de 2 etapas, la impedancia de entrada de la segunda etapa ($Z_{in,2}$) actúa como la carga física de corriente alterna de la primera etapa ($r_{load,1} = Rc_1 \parallel Z_{in,2}$ en CE/CB o $Re_1 \parallel Z_{in,2}$ en CC). Alterar cualquier parámetro de la etapa 2 altera de inmediato la ganancia y respuesta de la etapa 1.
* **Esquemas SVG Interactivos**: Dibujos vectoriales conformes a la Norma ISO que muestran el circuito en tiempo real. Al mover los sliders o pasar el cursor por los controles de parámetros, los componentes correspondientes se iluminan dinámicamente. Al activar 2 etapas, se muestran los esquemas de ambas etapas interconectados por un condensador de acoplamiento de CA ($C_c$).
* **Doble Osciloscopio con Canvas**:
  * **Osciloscopio 1 (Etapa 1)**: Muestra la señal de entrada $V_{in}$ superpuesta a la salida de la primera etapa $V_{out,1}$.
  * **Osciloscopio 2 (Respuesta Global)**: Muestra la señal de entrada $V_{in}$ frente a la salida final amplificada del sistema completo $V_{out,2}$.
  * Cada osciloscopio incluye controles independientes de zoom o escala visual.
* **Recta de Carga DC Dinámica por Etapa**: Visualización simultánea del punto de operación $Q_1$ de la etapa 1 y $Q_2$ de la etapa 2 en gráficos paralelos alineados bajo sus respectivos esquemas vectoriales, ilustrando de forma instantánea el balanceo dinámico de la señal en CA.
* **Respuesta en Frecuencia Completa**: Calcula el rango de frecuencias considerando la atenuación de entrada por la impedancia de base, el polo del condensador de acoplo de entrada $C_1$, de salida $C_2$, de acople interetapa $C_c$, de bypass $C_{e1}/C_{e2}$, y la atenuación en alta frecuencia debida al Efecto Miller.

---

## 📐 Modelo Matemático de Acoplamiento Multietapa

### 1. Polarización y Punto Q en Corriente Continua (DC)
Dado que las etapas están acopladas a través de condensadores, sus circuitos de polarización continua están completamente aislados:
* **Etapa 1**: Se calculan $Ib_1, Ic_1, Ve_1, Vc_1, Vce_1$ usando sus propios resistores ($R_{1,1}, R_{2,1}, Rc_1, Re_1$) y $\beta_1$.
* **Etapa 2**: Se calculan $Ib_2, Ic_2, Ve_2, Vc_2, Vce_2$ usando sus propios resistores ($R_{1,2}, R_{2,2}, Rc_2, Re_2$) y $\beta_2$.

Las ecuaciones de base para cada etapa $i$ (siendo $i \in \{1, 2\}$) son:
* **Tensión de Thévenin ($V_{th,i}$):** $V_{th,i} = V_{cc} \cdot \frac{R_{2,i}}{R_{1,i} + R_{2,i}}$
* **Resistencia de Thévenin ($R_{th,i}$):** $R_{th,i} = R_{1,i} \parallel R_{2,i}$
* **Corriente de base ($Ib_i$):** $Ib_i = \frac{V_{th,i} - V_{BE}}{R_{th,i} + (\beta_i + 1) \cdot Re_i} \quad (\text{Si } V_{th,i} > 0.7\text{ V})$
* **Corriente de colector ($Ic_i$):** $Ic_i = \beta_i \cdot Ib_i$
* **Detección de Saturación**: Si $Vce_i < 0.2\text{ V}$, se recalcula la etapa bajo las condiciones de saturación correspondientes a su topología.

---

### 2. Análisis Dinámico en Corriente Alterna (AC)

#### A. Parámetros de la Etapa 2 (Cargada por $Rl$)
* **Impedancia de Entrada ($Z_{in,2}$):**
  * *CE con bypass ($Ce_2$)*: $Z_{in,2} = R_{th2} \parallel (\beta_2 \cdot re_2)$
  * *CE sin bypass ($Ce_2$)*: $Z_{in,2} = R_{th2} \parallel [\beta_2 \cdot (re_2 + Re_2)]$
  * *CC*: $Z_{in,2} = R_{th2} \parallel [\beta_2 \cdot (re_2 + Re_2 \parallel Rl)]$
  * *CB*: $Z_{in,2} = Re_2 \parallel re_2$
* **Ganancia de Tensión ($Av_{2,mid}$):**
  * *CE con bypass*: $Av_{2,mid} = -\frac{Rc_2 \parallel Rl}{re_2}$
  * *CE sin bypass*: $Av_{2,mid} = -\frac{Rc_2 \parallel Rl}{re_2 + Re_2}$
  * *CC*: $Av_{2,mid} = \frac{Re_2 \parallel Rl}{re_2 + Re_2 \parallel Rl}$
  * *CB*: $Av_{2,mid} = \frac{Rc_2 \parallel Rl}{re_2}$
  *(donde $re_2 = 25\text{ mV} / Ic_2$)*

#### B. Parámetros de la Etapa 1 (Cargada por $Z_{in,2}$ en modo de 2 etapas)
La resistencia de carga de CA de la etapa 1 se determina como:
* $R_{load,1} = Z_{in,2}$ *(si numStages = 2)*
* $R_{load,1} = Rl$ *(si numStages = 1)*

Esto modifica dinámicamente su resistencia equivalente de carga de colector/emisor en AC:
* **Ganancia de Tensión de la Etapa 1 ($Av_{1,mid}$):**
  * *CE con bypass ($Ce_1$)*: $Av_{1,mid} = -\frac{Rc_1 \parallel R_{load,1}}{re_1}$
  * *CE sin bypass ($Ce_1$)*: $Av_{1,mid} = -\frac{Rc_1 \parallel R_{load,1}}{re_1 + Re_1}$
  * *CC*: $Av_{1,mid} = \frac{Re_1 \parallel R_{load,1}}{re_1 + Re_1 \parallel R_{load,1}}$
  * *CB*: $Av_{1,mid} = \frac{Rc_1 \parallel R_{load,1}}{re_1}$

#### C. Ganancia de Tensión Global ($Av_{total,mid}$)
Tomando en cuenta el divisor de tensión que se forma con la resistencia del generador $R_g = 600\  \Omega$:
* **1 Etapa**: $Av_{total,mid} = \frac{Z_{in,1}}{Rg + Z_{in,1}} \cdot Av_{1,mid}$
* **2 Etapas**: $Av_{total,mid} = \frac{Z_{in,1}}{Rg + Z_{in,1}} \cdot Av_{1,mid} \cdot Av_{2,mid}$

---

### 3. Respuesta en Frecuencia y Modelado de Polos
* **Polos de baja frecuencia ($f_L$):**
  $$f_{L1} = \frac{1}{2\pi C_1(R_g + Z_{in,1})} \quad (\text{Polo de Entrada})$$
  $$f_{L2} = \frac{1}{2\pi C_2(R_{out,2} + Rl)} \quad (\text{Polo de Salida})$$
  $$f_{L,c} = \frac{1}{2\pi C_c(R_{out,1} + Z_{in,2})} \quad (\text{Polo de Acoplamiento Interetapa})$$
  $$f_{Le1}, f_{Le2} \quad (\text{Polos de bypass para cada etapa})$$
  $$f_L = \sqrt{f_{L1}^2 + f_{Le1}^2 + f_{L,c}^2 + f_{L2}^2 + f_{Le2}^2}$$
* **Polos de alta frecuencia ($f_H$):**
  Calculados usando las capacitancias internas del BJT y el producto Ganancia-Ancho de Banda. La frecuencia $f_H$ total del sistema se calcula mediante la aproximación de cascada:
  $$f_H = \frac{1}{\sqrt{1/f_{H1}^2 + 1/f_{H2}^2}}$$

---

### 4. Límites de Recorte (Clipping)
La distorsión ocurre cuando la oscilación de corriente alterna supera los límites de corriente continua de la etapa correspondiente:
* **Etapa 1**: La onda de salida se recorta de forma no lineal según sus propios límites de alimentación $V_{cc}$ e $Ve_1 + 0.2\text{ V}$.
* **Etapa 2**: Recibe la señal ya distorsionada/recortada de la primera etapa y le aplica su propia amplificación y límites de recorte. Esto ilustra con rigor el comportamiento de un preamplificador saturando a una etapa de potencia.

---

## 💻 Ejecución del Simulador

La aplicación está desarrollada con tecnologías web estándar puras, sin dependencias externas pesadas ni compilación.

1. Abre la carpeta del proyecto y haz doble clic sobre el archivo [index.html](file:///C:/Users/ptorr/OneDrive/Documentos/JAVASCRIPT/transistor-amplifier-simulator/index.html) para abrirlo directamente en tu navegador.
2. Si prefieres iniciarlo en un servidor local ligero:
   * Con **Python**: `python -m http.server 8000`
   * Con **Node.js**: `npx http-server ./`
   Luego, accede a `http://localhost:8000` en tu navegador.

---

## 🧪 Escenarios de Prueba Recomendados

1. **Efecto de Carga Directo**: Conecta 2 Etapas. Configura la etapa 1 en `CE` y la etapa 2 en `CE`. En la pestaña de la Etapa 2, reduce drásticamente las resistencias divisorias de base $R_1$ y $R_2$ a valores muy bajos. Observará en el multímetro digital cómo la impedancia de entrada $Z_{in}$ de la etapa 2 desciende, cargando a la etapa 1 y provocando que la amplitud en el osciloscopio 1 disminuya severamente en tiempo real.
2. **Desfase en Cascada**:
   * Configura **`CE` + `CE`**: Ambas etapas invierten la fase de la señal. Al observar las trazas de entrada (azul) y salida final (fucsia) en el osciloscopio 2, verá que vuelven a estar perfectamente en fase (desfase acumulado de 360° o 0°).
   * Configura **`CE` + `CC`**: La salida final en el osciloscopio 2 estará invertida (desfase acumulado de 180°).
3. **Clipping en Cascada**: Configura 2 etapas. Aumenta la amplitud de entrada a $120\text{ mV}$. Observa cómo el osciloscopio 1 comienza a mostrar la parte inferior de la onda achatada (recorte de la primera etapa). En el segundo osciloscopio, la onda final fucsia presentará una deformidad combinada, reflejando el recorte acumulado.
