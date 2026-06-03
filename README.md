# BJT Amplifier Playground ⚡

Un simulador web interactivo de alto rendimiento en tiempo real para amplificadores de transistores bipolares NPN ($Q_1$), diseñado bajo una estética premium *Cyberpunk-Dark / Glassmorphism*. La aplicación permite conmutar instantáneamente entre tres configuraciones clásicas de amplificación BJT, modelando con rigor físico sus respuestas en corriente continua (DC), alterna (AC), ancho de banda y distorsión por recorte (clipping).

---

## 🚀 Características Clave
* **Multitopología Unificada**: Conmutación inmediata entre las tres configuraciones de amplificadores BJT:
  1. **Emisor Común (CE)**: Alta ganancia de tensión e inversión de fase (180°).
  2. **Colector Común / Seguidor de Emisor (CC)**: Ganancia unitaria en fase, altísima impedancia de entrada y baja de salida (búfer de corriente).
  3. **Base Común (CB)**: Alta ganancia de tensión en fase y bajísima impedancia de entrada (excelente para acoplo de RF).
* **Esquemas SVG Interactivos**: Dibujos vectoriales que siguen la norma ISO. Al mover los sliders o pasar el cursor por los controles de parámetros, los componentes correspondientes se iluminan dinámicamente.
* **Doble Osciloscopio con Canvas**: Muestra la señal senoidal de entrada y la de salida superpuestas, permitiendo apreciar el desfase y el efecto físico del clipping a medida que se aumenta la amplitud de entrada. Incluye un dial de zoom de escala visual para el canal de salida.
* **Recta de Carga DC Dinámica**: Representación de la recta de carga con el punto de operación $Q$ estático y una elipse dinámica que simula el balanceo real de la señal de audio en CA.
* **Respuesta en Frecuencia Completa**: Calcula y visualiza el ancho de banda del amplificador modelando los polos de baja frecuencia por condensadores y de alta frecuencia por el efecto Miller dinámico y junturas internas.
* **Preajustes Rápidos Adaptativos**: Presets para Audio Hi-Fi, Ganancia Máxima, Baja Distorsión y Saturación (Fuzz) adaptados a cada topología.

---

## 📐 Modelo Matemático del Simulador

El motor matemático de simulación está estructurado de acuerdo con las siguientes ecuaciones de la ingeniería electrónica analógica, mapeadas estrictamente a los componentes de la aplicación:

### 1. Polarización y Punto Q en Corriente Continua (DC)
La base de $Q_1$ se polariza mediante un divisor de tensión formado por $R_1$ y $R_2$. El punto de operación en reposo (punto Q) se calcula mediante:

* **Tensión de Thévenin en la base ($V_{th}$):**
  $$V_{th} = V_{cc} \cdot \frac{R_2}{R_1 + R_2}$$
* **Resistencia de Thévenin en la base ($R_{th}$):**
  $$R_{th} = R_1 \parallel R_2 = \frac{R_1 \cdot R_2}{R_1 + R_2}$$
* **Corriente de base en reposo ($Ib$):**
  $$Ib = \frac{V_{th} - V_{BE}}{R_{th} + (\beta + 1) \cdot Re} \quad (\text{Si } V_{th} > V_{BE} = 0.7\text{ V})$$
* **Corrientes de colector ($Ic$) y emisor ($Ie$) en reposo:**
  $$Ic = \beta \cdot Ib, \quad Ie = (\beta + 1) \cdot Ib$$
* **Voltaje de emisor en reposo ($Ve$):**
  $$Ve = Ie \cdot Re$$
* **Voltaje de colector en reposo ($Vc$):**
  * *CE y CB*: $Vc = V_{cc} - Ic \cdot Rc$
  * *CC*: $Vc = V_{cc}$
* **Voltaje colector-emisor en reposo ($Vce$):**
  $$Vce = Vc - Ve$$

#### Detección de Saturación ($Vce < V_{CE,sat} = 0.2\text{ V}$)
Si el punto Q calculado cae en saturación, las corrientes y voltajes se recalculan:
* *CE y CB*: $Ic = Ie = \frac{V_{cc} - 0.2}{Rc + Re}; \quad Vc = (Ie \cdot Re) + 0.2$
* *CC*: $Ie = \frac{V_{cc} - 0.2}{Re}; \quad Ve = V_{cc} - 0.2$

---

### 2. Análisis Dinámico en Corriente Alterna (AC) de Pequeña Señal
En la zona activa, se define la **resistencia dinámica intrínseca del emisor ($re$)** en base al voltaje térmico ($V_T = 25\text{ mV}$):
$$re = \frac{V_T}{Ic}$$

#### A. Emisor Común (CE)
* **Resistencia de colector de CA ($rc_{ac}$):** $rc_{ac} = Rc \parallel Rl$
* **Impedancia de entrada ($Z_{in}$):**
  * *Con condensador de bypass ($Ce$ activo)*: $Z_{in} = R_{th} \parallel (\beta \cdot re)$
  * *Sin condensador de bypass ($Ce$ inactivo)*: $Z_{in} = R_{th} \parallel [\beta \cdot (re + Re)]$
* **Ganancia de Tensión de Banda Media ($Av_{mid}$):**
  * *Con bypass ($Ce$)*: $Av_{mid} = -\frac{rc_{ac}}{re}$ *(Desfase de 180°)*
  * *Sin bypass ($Ce$)*: $Av_{mid} = -\frac{rc_{ac}}{re + Re}$ *(Desfase de 180°)*

#### B. Colector Común (CC)
* **Resistencia de emisor de CA ($re_{ac}$):** $re_{ac} = Re \parallel Rl$
* **Impedancia de entrada ($Z_{in}$):** $Z_{in} = R_{th} \parallel [\beta \cdot (re + re_{ac})]$ *(Muy elevada, $>100\text{ k}\Omega$)*
* **Ganancia de Tensión de Banda Media ($Av_{mid}$):** $Av_{mid} = \frac{re_{ac}}{re + re_{ac}}$ *(En fase, ganancia positiva slightly < 1)*

#### C. Base Común (CB)
* **Resistencia de colector de CA ($rc_{ac}$):** $rc_{ac} = Rc \parallel Rl$
* **Impedancia de entrada ($Z_{in}$):** $Z_{in} = Re \parallel re$ *(Sumamente baja, $5\ \Omega$ a $50\ \Omega$)*
* **Ganancia de Tensión de Banda Media ($Av_{mid}$):** $Av_{mid} = \frac{rc_{ac}}{re}$ *(Alta ganancia en fase)*

---

### 3. Respuesta en Frecuencia y Modelado de Polos
* **Polos de baja frecuencia ($f_L$) - Filtro Pasa Altos:**
  $$f_{L1} = \frac{1}{2\pi C_1(R_g + Z_{in})} \quad (\text{Polo de Entrada con } R_g=600\ \Omega)$$
  $$f_{L2} = \frac{1}{2\pi C_2(R_{out,AC} + Rl)} \quad (\text{Polo de Salida con } R_{out,AC}=Rc \text{ en CE/CB y } R_{eq,e} \text{ en CC})$$
  $$f_{Le} = \frac{1}{2\pi C_x R_{eq,x}} \quad (\text{Polo de bypass: } C_x=Ce, R_{eq,e} \text{ para CE; } C_x=Cb, \frac{R_{th}}{\beta+1} \text{ para CB})$$
  $$f_L = \sqrt{f_{L1}^2 + f_{L2}^2 + f_{Le}^2}$$
* **Polos de alta frecuencia ($f_H$) - Filtro Pasa Bajos:**
  Calculado con las capacitancias de juntura $C_{be} = 25\text{ pF}$ y $C_{bc} = 5\text{ pF}$:
  * *CE y CC (Efecto Miller)*: $C_M = C_{bc}(1 + |Av_{mid}|); \quad C_{in,H} = C_{be} + C_M; \quad f_H = \frac{1}{2\pi (R_g \parallel R_{th}) C_{in,H}}$
  * *CB (Sin Miller)*: $C_{in,H} = C_{be}; \quad f_H = \frac{1}{2\pi (R_g \parallel Z_{in}) C_{in,H}}$ *(Ancho de banda muy alto)*

---

### 4. Límites Físicos de Recorte (Clipping)
La distorsión ocurre cuando la oscilación dinámica de salida excede los límites físicos del transistor alimentado por $V_{cc}$:
* **CE**: El voltaje de colector instantáneo $v_c(t)$ está limitado por: $Ve + 0.2\text{ V} \le v_c(t) \le V_{cc}$
* **CC**: El voltaje de emisor instantáneo $v_e(t)$ está acotado por: $0\text{ V} \le v_e(t) \le V_{cc} - 0.2\text{ V}$
* **CB**: El voltaje de colector instantáneo $v_c(t)$ está limitado por: $Ve + 0.7\text{ V} \le v_c(t) \le V_{cc}$

---

## 📁 Estructura del Proyecto
```
transistor-amplifier-simulator/
├── index.html        # Estructura HTML con SVGs incrustados de los 3 circuitos y controles de sliders
├── style.css         # Hojas de estilo premium con temática ciberpunk y adaptabilidad responsiva
├── app.js            # Motor matemático, lógica del osciloscopio y renderizado de gráficos Canvas
└── README.md         # Documentación general y manual de usuario
```

---

## 💻 Ejecución del Simulador
La aplicación está desarrollada con tecnologías web estándar puras sin dependencias externas pesadas ni bases de datos.

### Método Rápido (Doble clic)
1. Descarga el repositorio o clónalo:
   ```bash
   git clone https://github.com/pableitor/transistor-amplifier-simulator.git
   ```
2. Abre la carpeta y haz doble clic sobre el archivo `index.html` para ejecutarlo inmediatamente en tu navegador.

### Método Servidor Local
Para iniciarlo en un servidor local ligero:
* Usando **Python**:
  ```bash
  python -m http.server 8000
  ```
* Usando **Node.js**:
  ```bash
  npx http-server ./
  ```
Luego, accede a `http://localhost:8000` en tu navegador.

---

## 🧪 Pruebas Recomendadas

1. **Audio Hi-Fi (CE)**: Activa el preset "Audio Hi-Fi" en la pestaña de Emisor Común. Con $V_{in} = 40\text{ mV}$ obtendrás una señal senoidal amplificada y limpia en oposición de fase (180°). El ancho de banda en reposo mostrará rangos de audio de alta fidelidad: `22Hz - 331kHz`.
2. **Efecto de Carga y Fase en Búfer (CC)**: Activa Colector Común. Observa que el voltaje de salida es casi idéntico al de entrada y está perfectamente en fase (0°). Mueve el control deslizante **Escala Salida (Vout)** a `20x` para igualar el multiplicador visual de entrada y notar la superposición de ambas señales sin perder resolución.
3. **Respuesta en Frecuencia de RF (CB)**: Cambia a Base Común. Mueve la frecuencia de entrada por encima de `100 kHz`. Mientras que en la topología CE la salida se atenúa por el efecto Miller, la topología CB mantiene la amplificación por su alta frecuencia de corte superior ($f_H > 2\text{ MHz}$).
4. **Saturación y Fuzz**: En configuración CE, sube la amplitud de entrada a `200 mV`. Verás que la onda de salida fucsia se aplana arriba (corte) y abajo (saturación), activando el parpadeo de alerta **"Onda Recortada (Clipping)"** en amarillo neón.
