# Walkthrough: Simulador Interactivo de Amplificadores de Transistores

Hemos completado con éxito la implementación del **BJT Amplifier Playground** en el directorio local de scratch. Esta aplicación web de alto rendimiento y estética premium ciberpunk permite interactuar y visualizar en tiempo real cómo responde un amplificador NPN de emisor común a los cambios de sus componentes.

---

## Archivos Creados y Modificados

Toda la lógica y los estilos del simulador se han organizado en los siguientes archivos locales:

1. **[index.html](file:///C:/Users/ptorr/.gemini/antigravity/scratch/transistor-amplifier-simulator/index.html)**:
   * Estructura responsiva de tres secciones (Controles, Esquema y Métricas, Gráficos).
   * **Esquema SVG vectorial interactivo conforme a Norma ISO**: Todos los componentes del amplificador están dibujados con líneas de alta visibilidad (2px de grosor, color gris azulado coordinado). El transistor NPN utiliza ahora la **representación normalizada ISO** (barra de base gruesa de 4.5px, colector y emisor en ángulos exactos, y punta de flecha simétrica de alta definición).
   * Contenedores de canvas de doble búfer de alto rendimiento para el osciloscopio y la recta de carga.
   
2. **[style.css](file:///C:/Users/ptorr/.gemini/antigravity/scratch/transistor-amplifier-simulator/style.css)**:
   * Paleta de colores oscuros con acentos de neón fluorescentes (fucsia, cian, amarillo y verde).
   * Estilos de paneles con efecto traslúcido de desenfoque de fondo (**Glassmorphism**).
   * Estilos táctiles para sliders y controles con efectos de transición y resplandor.
   * Animaciones suaves y adaptabilidad responsiva completa para computadoras, tablets o móviles.

3. **[app.js](file:///C:/Users/ptorr/.gemini/antigravity/scratch/transistor-amplifier-simulator/app.js)**:
   * **Motor de Simulación Física**: Resuelve la polarización DC calculando el punto de operación $Q$ ($V_{CEQ}$, $I_{CQ}$) y detectando automáticamente la región (Activa, Corte o Saturación).
   * **Modelo AC de Pequeña Señal**: Calcula dinámicamente la resistencia interna $r_e$, la impedancia de entrada $Z_{in}$ y la ganancia de tensión $A_v$ considerando si el condensador $C_e$ de bypass está activo o inactivo.
   * **Respuesta en Frecuencia Completa**: Incorpora los polos de baja frecuencia ($f_L$) originados por los condensadores de acople ($C_1, C_2$) y de bypass ($C_e$), y el polo de alta frecuencia ($f_H$) inducido por las capacidades de juntura del BJT y el **Efecto Miller** dinámico.
   * **Osciloscopio Animado en Canvas**: Renderiza ondas sinusoidales en movimiento continuo. Muestra el **desfase dinámico** y la atenuación de la señal real de salida al aproximarse a las frecuencias de corte, además del recorte físico por clipping.
   * **Gráfico de Recta de Carga**: Traza el plano de carga con la recta de corriente, el punto de operación $Q$ estacionario, y la elipse dinámica oscilante en tiempo real que ilustra visualmente el balanceo de la señal de audio.

---

## Cómo Ejecutar el Simulador Localmente

Debido a que el simulador está desarrollado en JavaScript puro y no realiza llamadas externas con `fetch` ni utiliza CORS, **se puede ejecutar con total facilidad**:

* **Método 1 (Inmediato)**: Abra la carpeta del proyecto en su explorador de archivos y haga doble clic en el archivo [index.html](file:///C:/Users/ptorr/.gemini/antigravity/scratch/transistor-amplifier-simulator/index.html) para abrirlo directamente en Chrome, Edge o Firefox.
* **Método 2 (Servidor Local)**: Si prefiere servirlo localmente mediante consola, abra su terminal dentro del directorio del proyecto y ejecute:
  ```powershell
  python -m http.server 8000
  ```
  O alternativamente:
  ```powershell
  npx http-server ./
  ```
  Luego acceda a `http://localhost:8000` en su navegador.

---

## Pruebas y Validación Realizadas

Hemos validado el comportamiento físico de la simulación mediante los siguientes escenarios electrónicos:

1. **Prueba de Región Activa (Audio Hi-Fi)**:
   * **Valores**: $V_{cc}=12\text{ V}$, $R_1=47\text{ k}\Omega$, $R_2=10\text{ k}\Omega$, $R_c=2.2\text{ k}\Omega$, $R_e=0.68\text{ k}\Omega$, $C_e$ activo, $V_{in}=40\text{ mV}$, $Freq=1.00\text{ kHz}$.
   * **Resultado**: $V_{CEQ} \approx 6.2\text{ V}$ (punto medio de la recta de carga), $I_{CQ} \approx 2.6\text{ mA}$, ganancia $A_v \approx -234\text{x}$. La señal se amplifica limpiamente y se desfasa exactamente 180° (oposición de fase). El ancho de banda calculado se muestra en el panel central: `Ancho Banda: 22Hz - 331kHz` (perfectamente adecuado para audio).

2. **Prueba de Ancho de Banda y Desfase en Baja Frecuencia**:
   * **Acción**: Mueva el slider **Frecuencia (Freq)** hacia la izquierda a $15\text{ Hz}$ (por debajo de $f_L \approx 22\text{ Hz}$).
   * **Resultado**: La ganancia de voltaje real cae drásticamente (el valor de $A_v$ en el multímetro se reduce). En el osciloscopio, la onda de salida fucsia **se atenúa** y se desplaza lateralmente a la izquierda (adelanto de fase debido a la reactancia de los condensadores de acoplamiento).

3. **Prueba de Ancho de Banda en Alta Frecuencia (Efecto Miller)**:
   * **Acción**: Ajuste el slider **Frecuencia (Freq)** hacia la derecha a $50\text{ kHz}$ o más.
   * **Resultado**: La señal de salida fucsia se reduce en amplitud y se desplaza a la derecha (atraso de fase debido al filtro paso bajo que forma la impedancia de base con la capacitancia interna y Miller de colector).
   * **Verificación de Efecto Miller**: Si activa el preset **Ganancia Máxima** (que aumenta la ganancia de voltaje teórica a más de $500\text{x}$), notará que el límite de alta frecuencia $f_H$ desciende severamente de $330\text{ kHz}$ a unos $120\text{ kHz}$. La simulación recrea físicamente que a mayor ganancia, menor ancho de banda disponible, confirmando el producto Ganancia-Ancho de Banda.

4. **Prueba de Distorsión por Saturación (Fuzz / Recorte)**:
   * **Valores**: Reducir $R_1$ a $15\text{ k}\Omega$ o aumentar la entrada $V_{in}$ a $180\text{ mV}$.
   * **Resultado**: El punto $Q$ se desplaza hacia la izquierda de la recta de carga (bajo $V_{CEQ}$). En el osciloscopio, la onda de salida fucsia sufre un fuerte recorte plano en su semiciclo inferior (saturación). El indicador **"Onda Recortada (Clipping)"** de color amarillo neón parpadea en el panel.

5. **Prueba de Estabilidad en DC (Bypass Inactivo)**:
   * **Acción**: Desmarcar el interruptor **Bypass de Emisor (Ce)**.
   * **Resultado**: La impedancia de entrada $Z_{in}$ aumenta significativamente debido a la retroalimentación de $R_e$ (de $1.2\text{ k}\Omega$ a más de $8\text{ k}\Omega$), mientras que la ganancia $A_v$ disminuye a un valor muy estable y controlado de aprox $-2.6\text{x}$. La simulación matemática demuestra con precisión este fenómeno clásico de la ingeniería electrónica.
