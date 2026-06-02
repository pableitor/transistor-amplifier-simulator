/**
 * BJT Multi-Topology Amplifier Simulator (CE, CC, CB)
 * Motor matemático de simulación, renderizado Canvas y lógica de interfaz
 */

// ==========================================================================
// Constantes Físicas y de Configuración
// ==========================================================================
const V_BE = 0.7;        // Voltaje Base-Emisor típico para conducción (V)
const V_CE_SAT = 0.2;    // Voltaje de saturación Colector-Emisor (V)
const V_T = 0.025;       // Voltaje térmico a temperatura ambiente (25 mV)

// ==========================================================================
// Estado de Topología Activa
// ==========================================================================
let activeConfig = 'CE'; // 'CE', 'CC', 'CB'

// ==========================================================================
// Selectores del DOM
// ==========================================================================
const inputs = {
  vcc: document.getElementById('param-vcc'),
  r1: document.getElementById('param-r1'),
  r2: document.getElementById('param-r2'),
  rc: document.getElementById('param-rc'),
  re: document.getElementById('param-re'),
  beta: document.getElementById('param-beta'),
  ce: document.getElementById('param-ce'),
  vin: document.getElementById('param-vin'),
  freq: document.getElementById('param-freq'),
  rl: document.getElementById('param-rl'),
  voutScale: document.getElementById('param-vout-scale'),
};

const readouts = {
  vcc: document.getElementById('val-vcc'),
  r1: document.getElementById('val-r1'),
  r2: document.getElementById('val-r2'),
  rc: document.getElementById('val-rc'),
  re: document.getElementById('val-re'),
  beta: document.getElementById('val-beta'),
  vin: document.getElementById('val-vin'),
  freq: document.getElementById('val-freq'),
  rl: document.getElementById('val-rl'),
  
  // DMM Lecturas
  vceq: document.getElementById('val-vceq'),
  icq: document.getElementById('val-icq'),
  av: document.getElementById('val-av'),
  zin: document.getElementById('val-zin'),
  
  // Estados
  statusContainer: document.getElementById('transistor-status-container'),
  statusText: document.getElementById('transistor-status-text'),
  clippingIndicator: document.getElementById('clipping-indicator'),
};

// Canvas
const canvases = {
  loadline: document.getElementById('canvas-loadline'),
  oscilloscope: document.getElementById('canvas-oscilloscope'),
};

const ctxs = {
  loadline: canvases.loadline.getContext('2d'),
  oscilloscope: canvases.oscilloscope.getContext('2d'),
};

// Presets
const presets = {
  audio: document.getElementById('preset-audio'),
  gain: document.getElementById('preset-gain'),
  stable: document.getElementById('preset-stable'),
  saturate: document.getElementById('preset-saturate'),
};

// Topology tabs
const topoTabs = document.querySelectorAll('.topo-tab');
const schematicTitle = document.getElementById('schematic-title');

// SVG containers
const svgContainers = {
  CE: document.getElementById('svg-ce'),
  CC: document.getElementById('svg-cc'),
  CB: document.getElementById('svg-cb'),
};

// Controls that can be disabled per topology
const ctrlRc = document.getElementById('ctrl-rc');
const ctrlCeSwitch = document.getElementById('ctrl-ce-switch');

// ==========================================================================
// Estado Global de Simulación
// ==========================================================================
let simData = {};
let animationTime = 0;
let activePreset = 'audio';

// ==========================================================================
// Mapeo de Sliders a Componentes SVG — por topología
// ==========================================================================
const svgMappings = {
  CE: {
    'param-vcc': { ids: [], styleClass: 'svg-active-out-text' },
    'param-r1': { ids: ['ce-svg-r1', 'ce-svg-r1-text'], styleClass: 'svg-active' },
    'param-r2': { ids: ['ce-svg-r2', 'ce-svg-r2-text'], styleClass: 'svg-active' },
    'param-rc': { ids: ['ce-svg-rc', 'ce-svg-rc-text'], styleClass: 'svg-active' },
    'param-re': { ids: ['ce-svg-re', 'ce-svg-re-text'], styleClass: 'svg-active' },
    'param-beta': { ids: ['ce-svg-q1-circle', 'ce-svg-q1-base', 'ce-svg-q1-collector', 'ce-svg-q1-emitter', 'ce-svg-q1-arrow', 'ce-svg-q1-text'], styleClass: 'svg-active' },
    'param-ce': { ids: ['ce-svg-ce-p1', 'ce-svg-ce-p2', 'ce-svg-ce-text'], styleClass: 'svg-active' },
    'param-vin': { ids: ['ce-svg-c1-p1', 'ce-svg-c1-p2', 'ce-svg-c1-text'], styleClass: 'svg-active' },
    'param-freq': { ids: ['ce-svg-c1-p1', 'ce-svg-c1-p2', 'ce-svg-c2-p1', 'ce-svg-c2-p2'], styleClass: 'svg-active' },
    'param-rl': { ids: ['ce-svg-rl', 'ce-svg-rl-text'], styleClass: 'svg-active' },
  },
  CC: {
    'param-vcc': { ids: [], styleClass: 'svg-active-out-text' },
    'param-r1': { ids: ['cc-svg-r1', 'cc-svg-r1-text'], styleClass: 'svg-active' },
    'param-r2': { ids: ['cc-svg-r2', 'cc-svg-r2-text'], styleClass: 'svg-active' },
    'param-rc': { ids: [], styleClass: 'svg-active' }, // No Rc in CC
    'param-re': { ids: ['cc-svg-re', 'cc-svg-re-text'], styleClass: 'svg-active' },
    'param-beta': { ids: ['cc-svg-q1-circle', 'cc-svg-q1-base', 'cc-svg-q1-collector', 'cc-svg-q1-emitter', 'cc-svg-q1-arrow', 'cc-svg-q1-text'], styleClass: 'svg-active' },
    'param-ce': { ids: [], styleClass: 'svg-active' }, // No Ce bypass in CC
    'param-vin': { ids: ['cc-svg-c1-p1', 'cc-svg-c1-p2', 'cc-svg-c1-text'], styleClass: 'svg-active' },
    'param-freq': { ids: ['cc-svg-c1-p1', 'cc-svg-c1-p2', 'cc-svg-c2-p1', 'cc-svg-c2-p2'], styleClass: 'svg-active' },
    'param-rl': { ids: ['cc-svg-rl', 'cc-svg-rl-text'], styleClass: 'svg-active' },
  },
  CB: {
    'param-vcc': { ids: [], styleClass: 'svg-active-out-text' },
    'param-r1': { ids: ['cb-svg-r1', 'cb-svg-r1-text'], styleClass: 'svg-active' },
    'param-r2': { ids: ['cb-svg-r2', 'cb-svg-r2-text'], styleClass: 'svg-active' },
    'param-rc': { ids: ['cb-svg-rc', 'cb-svg-rc-text'], styleClass: 'svg-active' },
    'param-re': { ids: ['cb-svg-re', 'cb-svg-re-text'], styleClass: 'svg-active' },
    'param-beta': { ids: ['cb-svg-q1-circle', 'cb-svg-q1-base', 'cb-svg-q1-collector', 'cb-svg-q1-emitter', 'cb-svg-q1-arrow', 'cb-svg-q1-text'], styleClass: 'svg-active' },
    'param-ce': { ids: ['cb-svg-cb-p1', 'cb-svg-cb-p2', 'cb-svg-cb-text'], styleClass: 'svg-active' },
    'param-vin': { ids: ['cb-svg-c1-p1', 'cb-svg-c1-p2', 'cb-svg-c1-text'], styleClass: 'svg-active' },
    'param-freq': { ids: ['cb-svg-c1-p1', 'cb-svg-c1-p2', 'cb-svg-c2-p1', 'cb-svg-c2-p2'], styleClass: 'svg-active' },
    'param-rl': { ids: ['cb-svg-rl', 'cb-svg-rl-text'], styleClass: 'svg-active' },
  },
};

// ==========================================================================
// Motor Matemático del Transistor BJT — Multitopología
// ==========================================================================
function runBjtSimulation() {
  // 1. Obtener valores de los controles deslizantes
  const Vcc = parseFloat(inputs.vcc.value);
  const R1 = parseFloat(inputs.r1.value) * 1000;
  const R2 = parseFloat(inputs.r2.value) * 1000;
  const Rc = parseFloat(inputs.rc.value) * 1000;
  const Re = parseFloat(inputs.re.value) * 1000;
  const beta = parseFloat(inputs.beta.value);
  const Ce = inputs.ce.checked;
  const Vin = (parseFloat(inputs.vin.value) / 1000);
  const freqSlider = parseFloat(inputs.freq.value);
  const frequency = Math.pow(10, freqSlider);
  const Rl = parseFloat(inputs.rl.value) * 1000;

  // 2. Análisis en Corriente Continua (DC Bias) — Común a las 3 topologías
  const Vth = Vcc * (R2 / (R1 + R2));
  const Rth = (R1 * R2) / (R1 + R2);
  
  let Ib = 0;
  let Ic = 0;
  let Ie = 0;
  let Ve = 0;
  let Vc = Vcc;
  let Vce = Vcc;
  let state = 'ACTIVA';

  if (Vth < V_BE) {
    state = 'CORTE';
    Ib = 0; Ic = 0; Ie = 0; Ve = 0;
    Vc = Vcc; Vce = Vcc;
  } else {
    Ib = (Vth - V_BE) / (Rth + (beta + 1) * Re);
    Ic = beta * Ib;
    Ie = (beta + 1) * Ib;
    Ve = Ie * Re;

    if (activeConfig === 'CC') {
      // CC: Colector directo a Vcc
      Vc = Vcc;
      Vce = Vcc - Ve;
    } else {
      // CE y CB: Colector a través de Rc
      Vc = Vcc - Ic * Rc;
      Vce = Vc - Ve;
    }

    // Comprobar saturación
    if (Vce < V_CE_SAT) {
      state = 'SATURACIÓN';
      if (activeConfig === 'CC') {
        // CC saturación: Ic_sat = (Vcc - V_CE_SAT) / Re
        Ie = (Vcc - V_CE_SAT) / Re;
        Ic = Ie; // Aproximación
        Ib = Ic / beta;
        Ve = Ie * Re;
        Vc = Vcc;
        Vce = V_CE_SAT;
      } else {
        // CE/CB saturación
        Ic = (Vcc - V_CE_SAT) / (Rc + Re);
        Ie = Ic;
        Ib = Ic / beta;
        Ve = Ic * Re;
        Vc = Ve + V_CE_SAT;
        Vce = V_CE_SAT;
      }
    }
  }

  // 3. Análisis en Corriente Alterna (AC Small Signal) — Específico por topología
  let re = Infinity;
  let Zin = Rth;
  let Av = 0;
  let AvMid = 0;
  let isInverted = false; // ¿La señal de salida está invertida 180°?
  
  if (state === 'ACTIVA' && Ic > 0) {
    re = V_T / Ic;
    
    switch (activeConfig) {
      case 'CE': {
        // ---- EMISOR COMÚN ----
        const rc_ac = parallel(Rc, Rl);
        isInverted = true; // CE invierte la señal
        
        if (Ce) {
          // Ce cortocircuita Re en AC (Bypassed)
          const Zbase = beta * re;
          Zin = parallel(Rth, Zbase);
          AvMid = -(rc_ac / re);
        } else {
          // Re influye en AC (Unbypassed)
          const Zbase = beta * (re + Re);
          Zin = parallel(Rth, Zbase);
          AvMid = -(rc_ac / (re + Re));
        }
        break;
      }
      
      case 'CC': {
        // ---- COLECTOR COMÚN (Seguidor de Emisor) ----
        const re_rl = parallel(Re, Rl);
        isInverted = false; // CC está en fase
        
        // Impedancia de entrada muy alta
        const Zbase = beta * (re + re_rl);
        Zin = parallel(Rth, Zbase);
        
        // Ganancia ≈ 1 (ligeramente menor)
        AvMid = re_rl / (re + re_rl);
        break;
      }
      
      case 'CB': {
        // ---- BASE COMÚN ----
        const rc_ac = parallel(Rc, Rl);
        isInverted = false; // CB está en fase
        
        // Impedancia de entrada muy baja (vista desde emisor)
        // Zin = Re || re (la resistencia intrínseca del emisor)
        Zin = parallel(Re, re);
        
        // Ganancia de voltaje alta y en fase
        AvMid = rc_ac / re;
        break;
      }
    }
  } else {
    AvMid = 0;
    Zin = (activeConfig === 'CB') ? parallel(Re, 1e6) : Rth;
  }

  // 3.1 Respuesta en Frecuencia
  const C1 = 10e-6;
  const C2 = 4.7e-6;
  const Ce_val = 47e-6;
  const Cb_val = 47e-6; // Condensador de bypass de base para CB
  const Rg = 600;
  
  // Polos de baja frecuencia (High-pass) — Dependen de la topología
  let fL1, fL2, fLe;
  
  switch (activeConfig) {
    case 'CE':
      fL1 = 1 / (2 * Math.PI * C1 * (Rg + Zin));
      fL2 = 1 / (2 * Math.PI * C2 * (Rc + Rl));
      fLe = 0;
      if (Ce && state === 'ACTIVA' && re !== Infinity) {
        const Req_e = parallel(Re, re + (parallel(Rth, Rg) / beta));
        fLe = 1 / (2 * Math.PI * Ce_val * Req_e);
      }
      break;
    case 'CC':
      fL1 = 1 / (2 * Math.PI * C1 * (Rg + Zin));
      fL2 = 1 / (2 * Math.PI * C2 * (parallel(Re, (re + parallel(Rth, Rg) / beta)) + Rl));
      fLe = 0;
      break;
    case 'CB':
      // Entrada por emisor, impedancia de entrada bajísima
      fL1 = 1 / (2 * Math.PI * C1 * (Rg + Zin));
      fL2 = 1 / (2 * Math.PI * C2 * (Rc + Rl));
      // Bypass de base
      fLe = 0;
      if (state === 'ACTIVA' && re !== Infinity) {
        const Rbase_cb = parallel(R1, R2);
        fLe = 1 / (2 * Math.PI * Cb_val * (Rbase_cb / (beta + 1)));
      }
      break;
  }
  
  const fL = Math.sqrt(fL1*fL1 + fL2*fL2 + fLe*fLe);
  
  // Polos de alta frecuencia (Low-pass)
  const Cbe = 25e-12;
  const Cbc = 5e-12;
  
  let fH;
  switch (activeConfig) {
    case 'CE': {
      const rc_val = state === 'ACTIVA' ? parallel(Rc, Rl) : Rc;
      const CM = Cbc * (1 + Math.abs(AvMid));
      const Cin_H = Cbe + CM;
      const Req_H = parallel(Rg, Rth);
      fH = 1 / (2 * Math.PI * Req_H * Cin_H);
      break;
    }
    case 'CC': {
      // CC tiene ganancia ≈ 1, así que efecto Miller es mínimo
      const CM = Cbc * (1 + Math.abs(AvMid)); // AvMid ≈ 1 → CM ≈ 2*Cbc
      const Cin_H = Cbe + CM;
      const Req_H = parallel(Rg, Rth);
      fH = 1 / (2 * Math.PI * Req_H * Cin_H);
      break;
    }
    case 'CB': {
      // CB no sufre efecto Miller (base a AC ground)
      // El ancho de banda es mucho mayor
      const Cin_H = Cbe; // Solo Cbe contribuye
      const Req_H = parallel(Rg, Zin); // Zin es muy bajo, por lo que Req_H ≈ Zin
      fH = 1 / (2 * Math.PI * Req_H * Cin_H);
      break;
    }
  }
  
  // Factor de atenuación dependiente de la frecuencia
  const lowPassFactor = 1 / Math.sqrt(1 + Math.pow(frequency / fH, 2));
  const highPassFactor = 1 / Math.sqrt(1 + Math.pow(fL / frequency, 2));
  
  // Ganancia final ajustada por frecuencia
  Av = AvMid * lowPassFactor * highPassFactor;
  
  // Ángulo de fase (desfase total AC)
  const thetaL = Math.atan(fL / frequency);
  const thetaH = -Math.atan(frequency / fH);
  let phaseShiftDeg = (thetaL + thetaH) * (180 / Math.PI);
  
  // Guardar datos en el estado global
  simData = {
    Vcc, R1, R2, Rc, Re, beta, Ce, Vin, Rl,
    Vth, Rth, Ib, Ic, Ie, Ve, Vc, Vce, state,
    re, Zin, Av, frequency, fL, fH, AvMid, phaseShiftDeg,
    isInverted, activeConfig
  };

  // Actualizar visualizaciones del DOM
  updateDmmReadouts();
}

// Helper para calcular paralelo
function parallel(r1, r2) {
  if (r1 === 0 || r2 === 0) return 0;
  return (r1 * r2) / (r1 + r2);
}

// ==========================================================================
// Actualización del DOM (Lecturas Digitales)
// ==========================================================================
function updateDmmReadouts() {
  // 1. Actualizar textos de los valores actuales junto a los sliders
  readouts.vcc.textContent = `${simData.Vcc} V`;
  readouts.r1.textContent = `${inputs.r1.value} kΩ`;
  readouts.r2.textContent = `${inputs.r2.value} kΩ`;
  readouts.rc.textContent = `${inputs.rc.value} kΩ`;
  readouts.re.textContent = `${inputs.re.value} kΩ`;
  readouts.beta.textContent = `${simData.beta}`;
  readouts.vin.textContent = `${inputs.vin.value} mV`;
  
  const f = simData.frequency;
  if (f < 1000) {
    readouts.freq.textContent = `${f.toFixed(0)} Hz`;
  } else {
    readouts.freq.textContent = `${(f / 1000).toFixed(2)} kHz`;
  }
  
  readouts.rl.textContent = `${inputs.rl.value} kΩ`;

  // 2. Actualizar Digital Multi-Meter (DMM)
  readouts.vceq.innerHTML = `${simData.Vce.toFixed(2)}<span class="metric-unit">V</span>`;
  readouts.icq.innerHTML = `${(simData.Ic * 1000).toFixed(2)}<span class="metric-unit">mA</span>`;
  
  if (simData.state === 'ACTIVA') {
    // Formatear ganancia para mostrar signo
    let avDisplay;
    if (simData.isInverted) {
      avDisplay = simData.Av.toFixed(1); // Av ya es negativo para CE
    } else {
      avDisplay = `+${simData.Av.toFixed(simData.activeConfig === 'CC' ? 3 : 1)}`;
    }
    
    const fHDisplay = simData.fH >= 1e6 
      ? `${(simData.fH/1e6).toFixed(1)}MHz`
      : `${(simData.fH/1000).toFixed(0)}kHz`;
    
    readouts.av.innerHTML = `${avDisplay}<span class="metric-unit">x</span>
      <div style="font-size: 0.65rem; color: var(--text-dim); margin-top: 3px; font-weight: 500; font-family: var(--font-sans);">
        Ancho Banda: ${simData.fL.toFixed(0)}Hz - ${fHDisplay}
      </div>`;
  } else {
    readouts.av.innerHTML = `0.0<span class="metric-unit">x</span>`;
  }
  
  const zinK = simData.Zin / 1000;
  if (zinK >= 1) {
    readouts.zin.innerHTML = `${zinK.toFixed(2)}<span class="metric-unit">kΩ</span>`;
  } else {
    readouts.zin.innerHTML = `${simData.Zin.toFixed(1)}<span class="metric-unit">Ω</span>`;
  }

  // 3. Estado de la polarización (Activa/Saturada/Corte)
  readouts.statusContainer.className = 'status-indicator';
  
  if (simData.state === 'ACTIVA') {
    readouts.statusContainer.classList.add('status-active');
    readouts.statusText.textContent = 'Región Activa';
  } else if (simData.state === 'SATURACIÓN') {
    readouts.statusContainer.classList.add('status-saturated');
    readouts.statusText.textContent = 'Saturación';
  } else {
    readouts.statusContainer.classList.add('status-cutoff');
    readouts.statusText.textContent = 'Corte (Cutoff)';
  }
  
  // 4. Actualizar etiqueta de leyenda de entrada del osciloscopio
  const legendInput = document.getElementById('legend-input-label');
  if (legendInput) {
    if (activeConfig === 'CB') {
      legendInput.textContent = 'Entrada Vin (x5)';
    } else {
      legendInput.textContent = 'Entrada Vin (x20)';
    }
  }
  
  // 5. Actualizar lectura y leyenda de la escala visual de salida
  const voutScaleVal = inputs.voutScale ? inputs.voutScale.value : '1';
  const valVoutScale = document.getElementById('val-vout-scale');
  if (valVoutScale) {
    valVoutScale.textContent = `${voutScaleVal}x`;
  }
  const legendOutput = document.getElementById('legend-output-label');
  if (legendOutput) {
    legendOutput.textContent = voutScaleVal === '1' ? 'Salida Vout (Real)' : `Salida Vout (x${voutScaleVal})`;
  }
}

// ==========================================================================
// RENDERIZADO GRÁFICO (Canvas)
// ==========================================================================

/**
 * Renderiza el gráfico de la Recta de Carga DC
 */
function drawLoadLine() {
  const canvas = canvases.loadline;
  const ctx = ctxs.loadline;
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.clearRect(0, 0, w, h);
  
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  
  const graphW = w - padL - padR;
  const graphH = h - padT - padB;
  
  // Dibujar Grilla y Ejes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (graphH * i) / gridLines;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
    
    const x = padL + (graphW * i) / gridLines;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, h - padB);
    ctx.stroke();
  }
  
  // Ejes principales
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, h - padB);
  ctx.lineTo(w - padR, h - padB);
  ctx.stroke();
  
  // Calcular resistencia total de carga DC para la recta
  let RloadDC;
  if (activeConfig === 'CC') {
    RloadDC = simData.Re; // CC: solo Re
  } else {
    RloadDC = simData.Rc + simData.Re; // CE y CB: Rc + Re
  }
  
  const maxIcCalc = simData.Vcc / RloadDC;
  const scaleV = simData.Vcc * 1.2;
  const scaleI = maxIcCalc * 1.3 * 1000;
  
  const mapX = (v) => padL + (v / scaleV) * graphW;
  const mapY = (iMa) => (h - padB) - (iMa / scaleI) * graphH;
  
  // Etiquetas del Eje X
  ctx.fillStyle = 'rgba(148, 163, 184, 1)';
  ctx.font = '10px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let v = 0; v <= scaleV; v += Math.ceil(scaleV / 5)) {
    if (v <= simData.Vcc * 1.1) {
      ctx.fillText(`${v.toFixed(0)}V`, mapX(v), h - padB + 8);
    }
  }
  ctx.fillText('Vce (Voltios)', padL + graphW / 2, h - 16);
  
  // Etiquetas del Eje Y
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= scaleI; i += Math.ceil(scaleI / 5)) {
    ctx.fillText(`${i.toFixed(1)}`, padL - 8, mapY(i));
  }
  
  ctx.save();
  ctx.translate(15, padT + graphH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Ic (miliamperios)', 0, 0);
  ctx.restore();
  
  // 2. Dibujar la Recta de Carga DC
  const icMaxMa = (simData.Vcc / RloadDC) * 1000;
  const vceMaxV = simData.Vcc;
  
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(mapX(0), mapY(icMaxMa));
  ctx.lineTo(mapX(vceMaxV), mapY(0));
  ctx.stroke();
  
  // Resplandor
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#ff007f';
  ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  
  // 3. Dibujar Punto Q
  const qX = mapX(simData.Vce);
  const qY = mapY(simData.Ic * 1000);
  
  // Líneas punteadas
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(qX, qY);
  ctx.lineTo(qX, h - padB);
  ctx.moveTo(qX, qY);
  ctx.lineTo(padL, qY);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Animación de balanceo AC
  if (simData.state === 'ACTIVA' && simData.Av !== 0) {
    const omega = 2 * Math.PI * 1;
    const dynamicOffset = Math.sin(animationTime * omega);
    
    const vinInst = simData.Vin * dynamicOffset;
    
    // Calcular voltaje de salida AC instantáneo según topología
    let voutInstIdeal;
    
    if (activeConfig === 'CC') {
      // CC: salida en emisor, ganancia positiva <1
      voutInstIdeal = simData.Av * vinInst;
      // Ve instantáneo
      let veInst = simData.Ve + voutInstIdeal;
      const veMin = 0;
      const veMax = simData.Vcc - V_CE_SAT;
      veInst = Math.max(veMin, Math.min(veMax, veInst));
      
      const vceInst = simData.Vcc - veInst;
      const icInstMa = (veInst / simData.Re) * 1000;
      
      const instX = mapX(vceInst);
      const instY = mapY(icInstMa);
      
      // Trayectoria del barrido AC
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      
      const voutMax = Math.abs(simData.Av * simData.Vin);
      const ext1Ve = Math.max(veMin, Math.min(veMax, simData.Ve - voutMax));
      const ext2Ve = Math.max(veMin, Math.min(veMax, simData.Ve + voutMax));
      const ext1Vce = simData.Vcc - ext1Ve;
      const ext2Vce = simData.Vcc - ext2Ve;
      const ext1IcMa = (ext1Ve / simData.Re) * 1000;
      const ext2IcMa = (ext2Ve / simData.Re) * 1000;
      
      ctx.moveTo(mapX(ext1Vce), mapY(ext1IcMa));
      ctx.lineTo(mapX(ext2Vce), mapY(ext2IcMa));
      ctx.stroke();
      
      ctx.fillStyle = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f2fe';
      ctx.beginPath();
      ctx.arc(instX, instY, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      
    } else {
      // CE y CB: salida en colector
      voutInstIdeal = simData.Av * vinInst;
      
      let vcInst = simData.Vc + voutInstIdeal;
      const vcMin = simData.Ve + V_CE_SAT;
      const vcMax = simData.Vcc;
      vcInst = Math.max(vcMin, Math.min(vcMax, vcInst));
      
      const vceInst = vcInst - simData.Ve;
      const icInstMa = ((simData.Vcc - vceInst) / RloadDC) * 1000;
      
      const instX = mapX(vceInst);
      const instY = mapY(icInstMa);
      
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      
      const voutMaxIdeal = Math.abs(simData.Av * simData.Vin);
      const ext1Vc = Math.max(vcMin, Math.min(vcMax, simData.Vc - voutMaxIdeal));
      const ext2Vc = Math.max(vcMin, Math.min(vcMax, simData.Vc + voutMaxIdeal));
      const ext1Vce = ext1Vc - simData.Ve;
      const ext2Vce = ext2Vc - simData.Ve;
      const ext1IcMa = ((simData.Vcc - ext1Vce) / RloadDC) * 1000;
      const ext2IcMa = ((simData.Vcc - ext2Vce) / RloadDC) * 1000;
      
      ctx.moveTo(mapX(ext1Vce), mapY(ext1IcMa));
      ctx.lineTo(mapX(ext2Vce), mapY(ext2IcMa));
      ctx.stroke();
      
      ctx.fillStyle = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f2fe';
      ctx.beginPath();
      ctx.arc(instX, instY, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  
  // Dibujar punto Q estático
  ctx.fillStyle = '#ffb700';
  ctx.beginPath();
  ctx.arc(qX, qY, 6, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.strokeStyle = '#060813';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  ctx.fillStyle = '#ffb700';
  ctx.font = 'bold 9px Outfit, Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(' Punto Q', qX + 8, qY - 4);
}

/**
 * Renderiza el Osciloscopio con la señal de entrada y la de salida
 */
function drawOscilloscope() {
  const canvas = canvases.oscilloscope;
  const ctx = ctxs.oscilloscope;
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.clearRect(0, 0, w, h);
  
  // Cuadrícula estilo fósforo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  
  const divisionsX = 10;
  const divisionsY = 6;
  
  for (let i = 1; i < divisionsX; i++) {
    const x = (w * i) / divisionsX;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  
  for (let i = 1; i < divisionsY; i++) {
    const y = (h * i) / divisionsY;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  
  // Eje central
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  
  const hasSignal = simData.state === 'ACTIVA' && simData.Av !== 0;
  
  // Amplificador visual de entrada — para CB usamos x5 por la baja Zin
  const viewInputAmplifier = (activeConfig === 'CB') ? 5 : 20;
  
  const scaleFactorY = (h * 0.4) / (simData.Vcc / 2);
  
  const points = w;
  const frequencyHz = 2;
  
  let isClippingDetected = false;
  
  ctx.lineWidth = 2;
  
  // 1. SEÑAL DE ENTRADA
  ctx.strokeStyle = '#00f2fe';
  ctx.beginPath();
  
  for (let x = 0; x < points; x++) {
    const timeRatio = x / points;
    const angle = 2 * Math.PI * frequencyHz * timeRatio - (animationTime * 2 * Math.PI);
    
    const vInInstant = simData.Vin * Math.sin(angle);
    const vInScaled = vInInstant * viewInputAmplifier;
    const yPixel = h / 2 - (vInScaled * scaleFactorY);
    
    if (x === 0) {
      ctx.moveTo(x, yPixel);
    } else {
      ctx.lineTo(x, yPixel);
    }
  }
  ctx.stroke();
  
  // 2. SEÑAL DE SALIDA
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 2.5;
  
  ctx.save();
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#ff007f';
  
  ctx.beginPath();
  
  for (let x = 0; x < points; x++) {
    const timeRatio = x / points;
    const angle = 2 * Math.PI * frequencyHz * timeRatio - (animationTime * 2 * Math.PI);
    
    // Desfase adicional por polos de frecuencia
    const phaseShiftRad = simData.phaseShiftDeg * Math.PI / 180;
    
    // Salida ideal con desfase
    const vOutIdeal = simData.Av * simData.Vin * Math.sin(angle + phaseShiftRad);
    
    // Clipping según topología
    let vOutRealAc;
    
    if (activeConfig === 'CC') {
      // CC: salida en emisor
      let veAbsolute = simData.Ve + vOutIdeal;
      const veMaxLimit = simData.Vcc - V_CE_SAT;
      const veMinLimit = 0;
      
      if (veAbsolute > veMaxLimit) { veAbsolute = veMaxLimit; isClippingDetected = true; }
      if (veAbsolute < veMinLimit) { veAbsolute = veMinLimit; isClippingDetected = true; }
      
      vOutRealAc = veAbsolute - simData.Ve;
    } else if (activeConfig === 'CB') {
      // CB: salida en colector
      let vcAbsolute = simData.Vc + vOutIdeal;
      const vcMaxLimit = simData.Vcc;
      // En CB, la saturación ocurre cuando Vc baja por debajo de Vb ≈ Vth
      const vcMinLimit = Math.max(simData.Ve + V_CE_SAT, simData.Vth);
      
      if (vcAbsolute > vcMaxLimit) { vcAbsolute = vcMaxLimit; isClippingDetected = true; }
      if (vcAbsolute < vcMinLimit) { vcAbsolute = vcMinLimit; isClippingDetected = true; }
      
      vOutRealAc = vcAbsolute - simData.Vc;
    } else {
      // CE: salida en colector
      let vcAbsolute = simData.Vc + vOutIdeal;
      const vcMaxLimit = simData.Vcc;
      const vcMinLimit = simData.Ve + V_CE_SAT;
      
      if (vcAbsolute > vcMaxLimit) { vcAbsolute = vcMaxLimit; isClippingDetected = true; }
      if (vcAbsolute < vcMinLimit) { vcAbsolute = vcMinLimit; isClippingDetected = true; }
      
      vOutRealAc = vcAbsolute - simData.Vc;
    }
    
    const visualScale = inputs.voutScale ? parseFloat(inputs.voutScale.value) : 1;
    const yPixel = h / 2 - (vOutRealAc * scaleFactorY * visualScale);
    
    if (x === 0) {
      ctx.moveTo(x, yPixel);
    } else {
      ctx.lineTo(x, yPixel);
    }
  }
  ctx.stroke();
  ctx.restore();
  
  // 3. Indicador de recorte
  if (isClippingDetected) {
    readouts.clippingIndicator.style.display = 'inline-flex';
  } else {
    readouts.clippingIndicator.style.display = 'none';
  }
}

// ==========================================================================
// Bucle de Animación Dinámica (60 FPS)
// ==========================================================================
function animationLoop() {
  animationTime += 0.005;
  drawLoadLine();
  drawOscilloscope();
  requestAnimationFrame(animationLoop);
}

// ==========================================================================
// Cambio de Topología
// ==========================================================================
function switchTopology(topo) {
  activeConfig = topo;
  
  // Actualizar pestañas
  topoTabs.forEach(tab => {
    if (tab.dataset.topo === topo) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    } else {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    }
  });
  
  // Conmutar SVG visible
  Object.entries(svgContainers).forEach(([key, svg]) => {
    if (key === topo) {
      svg.classList.add('active');
    } else {
      svg.classList.remove('active');
    }
  });
  
  // Actualizar título del esquema
  const titles = {
    CE: 'Esquema: Emisor Común (CE)',
    CC: 'Esquema: Colector Común (CC)',
    CB: 'Esquema: Base Común (CB)',
  };
  schematicTitle.textContent = titles[topo];
  
  // Habilitar/deshabilitar controles según topología
  updateControlStates();
  
  // Re-ejecutar simulación
  runBjtSimulation();
}

function updateControlStates() {
  // Rc: no aplica en CC (colector directo a Vcc)
  if (ctrlRc) {
    if (activeConfig === 'CC') {
      ctrlRc.classList.add('control-disabled');
    } else {
      ctrlRc.classList.remove('control-disabled');
    }
  }
  
  // Ce bypass switch:
  // - CE: activo (bypass de emisor)
  // - CC: desactivado (no hay bypass en CC)
  // - CB: activo (reinterpretado como Cb, bypass de base)
  if (ctrlCeSwitch) {
    const label = ctrlCeSwitch.querySelector('.switch-label');
    if (activeConfig === 'CC') {
      ctrlCeSwitch.classList.add('control-disabled');
    } else if (activeConfig === 'CB') {
      ctrlCeSwitch.classList.remove('control-disabled');
      if (label) label.textContent = 'Bypass de Base (Cb)';
    } else {
      ctrlCeSwitch.classList.remove('control-disabled');
      if (label) label.textContent = 'Bypass de Emisor (Ce)';
    }
  }
}

// ==========================================================================
// Controladores de Eventos e Interactividad
// ==========================================================================
function setupControls() {
  Object.values(inputs).forEach(input => {
    input.addEventListener('input', () => {
      runBjtSimulation();
      Object.values(presets).forEach(btn => btn.classList.remove('active'));
    });
  });
  
  // Resaltado de componentes en esquema SVG — dinámico por topología
  setupSvgHighlighting();
}

function setupSvgHighlighting() {
  const allControlIds = Object.keys(svgMappings.CE);
  
  allControlIds.forEach(controlId => {
    const element = document.getElementById(controlId);
    if (!element) return;
    
    const highlight = (active) => {
      const mapping = svgMappings[activeConfig];
      if (!mapping || !mapping[controlId]) return;
      
      const svgData = mapping[controlId];
      svgData.ids.forEach(id => {
        const svgEl = document.getElementById(id);
        if (svgEl) {
          if (active) {
            svgEl.classList.add(svgData.styleClass);
          } else {
            svgEl.classList.remove(svgData.styleClass);
          }
        }
      });
    };
    
    element.addEventListener('mouseenter', () => highlight(true));
    element.addEventListener('mouseleave', () => highlight(false));
    element.addEventListener('focus', () => highlight(true));
    element.addEventListener('blur', () => highlight(false));
  });
}

// ==========================================================================
// Preajustes Rápidos (Presets) — Adaptativos por topología
// ==========================================================================
const presetValues = {
  CE: {
    audio: { vcc: 12, r1: 47, r2: 10, rc: 2.2, re: 0.68, beta: 200, ce: true, vin: 40, freq: 3.0, rl: 10 },
    gain: { vcc: 15, r1: 100, r2: 15, rc: 5.6, re: 0.47, beta: 300, ce: true, vin: 15, freq: 3.0, rl: 20 },
    stable: { vcc: 12, r1: 33, r2: 12, rc: 1.5, re: 1.0, beta: 150, ce: false, vin: 150, freq: 3.0, rl: 10 },
    saturate: { vcc: 9, r1: 68, r2: 5, rc: 3.3, re: 0.22, beta: 250, ce: true, vin: 180, freq: 3.0, rl: 10 },
  },
  CC: {
    audio: { vcc: 12, r1: 47, r2: 22, rc: 2.2, re: 2.2, beta: 200, ce: false, vin: 100, freq: 3.0, rl: 4.7 },
    gain: { vcc: 15, r1: 68, r2: 33, rc: 2.2, re: 3.3, beta: 300, ce: false, vin: 200, freq: 3.0, rl: 8.2 },
    stable: { vcc: 12, r1: 33, r2: 15, rc: 2.2, re: 1.5, beta: 150, ce: false, vin: 300, freq: 3.0, rl: 10 },
    saturate: { vcc: 9, r1: 100, r2: 22, rc: 2.2, re: 1.0, beta: 250, ce: false, vin: 300, freq: 3.0, rl: 3 },
  },
  CB: {
    audio: { vcc: 12, r1: 47, r2: 10, rc: 2.2, re: 0.68, beta: 200, ce: true, vin: 20, freq: 3.0, rl: 10 },
    gain: { vcc: 15, r1: 100, r2: 15, rc: 5.6, re: 0.47, beta: 300, ce: true, vin: 10, freq: 3.0, rl: 20 },
    stable: { vcc: 12, r1: 33, r2: 12, rc: 1.5, re: 1.0, beta: 150, ce: true, vin: 50, freq: 3.0, rl: 10 },
    saturate: { vcc: 9, r1: 68, r2: 5, rc: 3.3, re: 0.22, beta: 250, ce: true, vin: 100, freq: 3.0, rl: 10 },
  },
};

function applyPreset(key) {
  const p = presetValues[activeConfig]?.[key];
  if (!p) return;
  
  inputs.vcc.value = p.vcc;
  inputs.r1.value = p.r1;
  inputs.r2.value = p.r2;
  inputs.rc.value = p.rc;
  inputs.re.value = p.re;
  inputs.beta.value = p.beta;
  inputs.ce.checked = p.ce;
  inputs.vin.value = p.vin;
  inputs.freq.value = p.freq;
  inputs.rl.value = p.rl;
  
  Object.entries(presets).forEach(([k, btn]) => {
    if (k === key) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  runBjtSimulation();
}

function setupPresets() {
  Object.entries(presets).forEach(([key, btn]) => {
    btn.addEventListener('click', () => {
      applyPreset(key);
    });
  });
}

// ==========================================================================
// Configuración de Pestañas de Topología
// ==========================================================================
function setupTopologyTabs() {
  topoTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTopology(tab.dataset.topo);
      // Resetear presets activos
      Object.values(presets).forEach(btn => btn.classList.remove('active'));
    });
  });
}

// ==========================================================================
// Inicialización
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupControls();
  setupPresets();
  setupTopologyTabs();
  
  // Inicializar con CE
  switchTopology('CE');
  applyPreset('audio');
  
  // Iniciar bucle de renderizado animado continuo
  animationLoop();
});
