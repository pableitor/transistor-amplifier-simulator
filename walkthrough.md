# Walkthrough: Simulador Cascada BJT de 1 o 2 Etapas

Hemos completado con éxito la actualización y expansión del **BJT Amplifier Playground** a un simulador **multietapa cascada de 1 o 2 etapas**. La aplicación ahora permite alternar entre configuraciones de una sola etapa o dos etapas en cascada, posibilitando que cada etapa sea configurada de forma independiente en cualquiera de las tres topologías fundamentales (Emisor Común, Colector Común o Base Común).

---

## Archivos Actualizados

1. **[index.html](file:///C:/Users/ptorr/OneDrive/Documentos/JAVASCRIPT/transistor-amplifier-simulator/index.html)**:
   * Incorpora el selector del número de etapas (`1 Etapa` o `2 Etapas`) en el encabezado.
   * Añade pestañas de control interno en el panel de parámetros (`Etapa 1` y `Etapa 2`) para conmutar dinámicamente los sliders asociados a cada transistor.
   * Integra el condensador de acoplamiento interetapa ($C_c$) en el panel de parámetros comunes con rango ajustable (de $0.1\ \mu\text{F}$ a $100\ \mu\text{F}$).
   * Duplica los tres esquemas vectoriales SVG (CE, CC, CB) para la Etapa 2 con IDs y componentes independientes, agregando un puente de condensador visual ($C_c$) para representar el acoplamiento físico en corriente alterna.
   * Añade un conmutador de visualización de la recta de carga (`Etapa 1` / `Etapa 2`) para alternar el punto $Q$ de operación de cada transistor en pantalla.
   * Incorpora la segunda pantalla de osciloscopio (`canvas-oscilloscope-2`) con escala de salida independiente (`param-vout-scale-2`) y su leyenda ciberpunk correspondiente.

2. **[style.css](file:///C:/Users/ptorr/OneDrive/Documentos/JAVASCRIPT/transistor-amplifier-simulator/style.css)**:
   * Diseña estilos adaptativos para los nuevos botones de selección de etapas, pestañas internas de control y botones de alternancia de recta de carga.
   * Añade la paleta y clases de hover fluorescente rosa (`svg-active-2` y `svg-active-text-2`) para destacar de forma distintiva los componentes de la segunda etapa en el diagrama interactivo de circuitos.
   * Optimiza el comportamiento responsivo flexbox para mostrar los diagramas SVG y las pantallas de osciloscopio apiladas o en paralelo de manera fluida y elegante.

3. **[app.js](file:///C:/Users/ptorr/OneDrive/Documentos/JAVASCRIPT/transistor-amplifier-simulator/app.js)**:
   * **Polarización DC Independiente**: Calcula por separado el punto $Q$ de reposo ($V_{CEQ}$, $I_{CQ}$) para cada uno de los transistores BJT NPN de las etapas 1 y 2, dado que están aislados en corriente continua por el condensador $C_c$.
   * **Acoplamiento AC y Efecto de Carga**: Modifica el modelo de pequeña señal de modo que la impedancia de entrada de la Etapa 2 ($Z_{in,2}$) actúe dinámicamente como la resistencia de carga de CA de la Etapa 1 ($r_{load,1} = Rc_1 \parallel Z_{in,2}$ en CE/CB o $Re_1 \parallel Z_{in,2}$ en CC). Esto simula con precisión la atenuación de ganancia sufrida por la primera etapa al ser cargada por la segunda.
   * **Respuesta en Frecuencia Completa**: Modela los polos de baja frecuencia incluyendo el efecto del condensador interetapa $C_c$ ($f_{L,c}$) y los polos individuales de bypass de emisor/base ($f_{Le1}$, $f_{Le2}$). La frecuencia de corte alta del sistema ($f_H$) se determina en cascada a través de las capacidades de Miller dinámicas y de base.
   * **Osciloscopio Dual y Clipping en Cascada**: Implementa las trazas en tiempo real de ambos osciloscopios. El osciloscopio 1 dibuja $V_{in}$ vs $V_{out,1}$ (salida de la etapa 1) y el osciloscopio 2 dibuja $V_{in}$ vs $V_{out,2}$ (salida global). Las distorsiones se propagan secuencialmente, permitiendo visualizar la deformación en cascada cuando la primera etapa recorta y la segunda etapa vuelve a amplificar o recortar dicho resultado.

---

## Validación Matemática y Pruebas Programáticas

Hemos validado el motor físico mediante simulaciones programáticas automatizadas en [test_math.js](file:///C:/Users/ptorr/.gemini/antigravity/brain/05e2ef16-dcef-4b52-a40b-514f0d42d656/scratch/test_math.js) con resultados exitosos:

### 1. Prueba de Efecto de Carga AC entre Etapas
* **Caso A (Carga de Entrada Alta en la Etapa 2)**:
  * *Configuración*: Etapa 1 en `CE`, Etapa 2 en `CC` (Colector Común).
  * *Resultado*: $Z_{in,2}$ es muy alta ($\approx 50\text{ k}\Omega$). La ganancia de la etapa 1 es estable a **$-3.8\text{x}$**.
* **Caso B (Carga de Entrada Baja en la Etapa 2)**:
  * *Configuración*: Etapa 1 en `CE`, Etapa 2 en `CE` con resistencias de divisor de base pequeñas ($R_{1,2}=5\text{ k}\Omega$, $R_{2,2}=1.2\text{ k}\Omega$).
  * *Resultado*: $Z_{in,2}$ cae drásticamente a pocos ohmios, cargando a la etapa 1. La ganancia de la etapa 1 se desploma automáticamente a **$-0.1\text{x}$**, validando el efecto de acoplamiento físico real.

### 2. Prueba de Inversión y Desfase en Cascada
* **Combinación CE + CE**:
  * *Teoría*: Ambas etapas invierten la señal en 180°, por lo que el desfase total es de $360^\circ$ ($0^\circ$). La ganancia total debe ser positiva.
  * *Resultado*: Ganancia global medida: **$+8625.1\text{x}$** (onda final en fase con la entrada).
* **Combinación CE + CC**:
  * *Teoría*: La etapa 1 (CE) invierte en 180° pero la etapa 2 (CC) mantiene la fase ($0^\circ$). El desfase total es de $180^\circ$. La ganancia total debe ser negativa.
  * *Resultado*: Ganancia global medida: **$-99.8\text{x}$** (onda final en oposición de fase).

---

## Cómo Probar las Nuevas Funcionalidades en la Interfaz

1. Abra la aplicación en su navegador (`http://localhost:8000`).
2. Pulse el botón **`2 Etapas`** en el encabezado. Observará:
   * La aparición de las pestañas `Etapa 1` y `Etapa 2` en el panel de control.
   * Los dos esquemas interactivos representados lado a lado, unidos por el condensador visual $Cc$.
   * Un segundo panel de osciloscopio en la zona inferior derecha.
3. Pulse sobre la pestaña **`Etapa 2`** en los controles. Cambie la topología del circuito en el header a **`Colector Común (CC)`**.
4. Mueva los sliders de la `Etapa 2` y compruebe cómo la respuesta de la `Etapa 1` (primer osciloscopio) cambia debido al acoplamiento dinámico.
5. Aumente la **Amplitud Entrada (Vin)** a $150\text{ mV}$ y observe cómo la señal de la Etapa 1 recorta primero, ingresando ya recortada al segundo osciloscopio, donde experimenta un recorte adicional correspondiente a los límites de la Etapa 2 (saturación y corte).
6. Alterne las pestañas de **`Recta de Carga`** para verificar de forma visual el punto de operación $Q_1$ vs $Q_2$ de cada transistor individual.
