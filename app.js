/**
 * BJT Multi-Topology Amplifier Simulator (CE, CC, CB) - Cascaded 1 or 2 Stages
 * Motor matemático de simulación, renderizado Canvas y lógica de interfaz
 */

// ==========================================================================
// Constantes Físicas y de Configuración
// ==========================================================================
const V_BE = 0.7;        // Voltaje Base-Emisor típico para conducción (V)
const V_CE_SAT = 0.2;    // Voltaje de saturación Colector-Emisor (V)
const V_T = 0.025;       // Voltaje térmico a temperatura ambiente (25 mV)

// ==========================================================================
// Estado Global de Simulación
// ==========================================================================
let numStages = 1;       // 1 o 2 etapas
let activeConfig1 = 'CE'; // 'CE', 'CC', 'CB' para la Etapa 1
let activeConfig2 = 'CC'; // 'CE', 'CC', 'CB' para la Etapa 2
let activeStageTab = 1;  // Pestana activa en el panel de control (1 o 2)
let activeLoadlineStage = 1; // Etapa graficada en la recta de carga (1 o 2)

let simData = {};
let animationTime = 0;
let activePreset = 'audio';

// ==========================================================================
// Selectores del DOM
// ==========================================================================
const inputs = {
  vcc: document.getElementById('param-vcc'),
  vin: document.getElementById('param-vin'),
  freq: document.getElementById('param-freq'),
  rl: document.getElementById('param-rl'),
  
  // Etapa 1
  r1: document.getElementById('param-r1'),
  r2: document.getElementById('param-r2'),
  rc: document.getElementById('param-rc'),
  re: document.getElementById('param-re'),
  beta: document.getElementById('param-beta'),
  ce: document.getElementById('param-ce'),
  voutScale: document.getElementById('param-vout-scale'),
  
  // Etapa 2
  r1_2: document.getElementById('param-r1-2'),
  r2_2: document.getElementById('param-r2-2'),
  rc_2: document.getElementById('param-rc-2'),
  re_2: document.getElementById('param-re-2'),
  beta_2: document.getElementById('param-beta-2'),
  ce_2: document.getElementById('param-ce-2'),
  voutScale_2: document.getElementById('param-vout-scale-2'),
  
  // Acoplamiento Cc
  cc: document.getElementById('param-cc'),
};

const readouts = {
  vcc: document.getElementById('val-vcc'),
  vin: document.getElementById('val-vin'),
  freq: document.getElementById('val-freq'),
  rl: document.getElementById('val-rl'),
  
  // Etapa 1
  r1: document.getElementById('val-r1'),
  r2: document.getElementById('val-r2'),
  rc: document.getElementById('val-rc'),
  re: document.getElementById('val-re'),
  beta: document.getElementById('val-beta'),
  
  // Etapa 2
  r1_2: document.getElementById('val-r1-2'),
  r2_2: document.getElementById('val-r2-2'),
  rc_2: document.getElementById('val-rc-2'),
  re_2: document.getElementById('val-re-2'),
  beta_2: document.getElementById('val-beta-2'),
  cc: document.getElementById('val-cc'),
  
  // DMM Lecturas
  vceq: document.getElementById('val-vceq'),
  icq: document.getElementById('val-icq'),
  av: document.getElementById('val-av'),
  zin: document.getElementById('val-zin'),
  
  // Estados y alertas
  clippingIndicator: document.getElementById('clipping-indicator'),
};

// Canvas y Contextos
const canvases = {
  loadline: document.getElementById('canvas-loadline'),
  oscilloscope: document.getElementById('canvas-oscilloscope'),
  oscilloscope2: document.getElementById('canvas-oscilloscope-2'),
};

const ctxs = {
  loadline: canvases.loadline.getContext('2d'),
  oscilloscope: canvases.oscilloscope.getContext('2d'),
  oscilloscope2: canvases.oscilloscope2 ? canvases.oscilloscope2.getContext('2d') : null,
};

// Controles y visuales de la Etapa 2
const stageTabsWrapper = document.getElementById('stage-tabs-wrapper');
const controlsStage1 = document.getElementById('controls-stage-1');
const controlsStage2 = document.getElementById('controls-stage-2');
const ctrlCc = document.getElementById('ctrl-cc');
const cardOscilloscope2 = document.getElementById('card-oscilloscope-2');
const inputVoutScale2 = document.getElementById('param-vout-scale-2');
const readoutVoutScale2 = document.getElementById('val-vout-scale-2');
const legendOutput2 = document.getElementById('legend-output-label-2');
const clippingIndicator2 = document.getElementById('clipping-indicator-2');
const loadlineSelectWrapper = document.getElementById('loadline-select-wrapper');

// Esquemas SVG
const schematicTitle = document.getElementById('schematic-title');
const schematicStage1 = document.getElementById('schematic-stage-1');
const schematicStage2 = document.getElementById('schematic-stage-2');
const schematicConnector = document.getElementById('schematic-interstage-connector');

const svgContainers = {
  CE: document.getElementById('svg-ce'),
  CC: document.getElementById('svg-cc'),
  CB: document.getElementById('svg-cb'),
};

const svgContainers2 = {
  CE: document.getElementById('svg-ce-2'),
  CC: document.getElementById('svg-cc-2'),
  CB: document.getElementById('svg-cb-2'),
};

// Presets
const presets = {
  audio: document.getElementById('preset-audio'),
  gain: document.getElementById('preset-gain'),
  stable: document.getElementById('preset-stable'),
  saturate: document.getElementById('preset-saturate'),
};

const topoTabs = document.querySelectorAll('.topo-tab');

// Habilitar/deshabilitar controles según topología
const ctrlRc = document.getElementById('ctrl-rc');
const ctrlCeSwitch = document.getElementById('ctrl-ce-switch');

// ==========================================================================
// Mapeo de Sliders a Componentes SVG (Etapa 1)
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
    'param-rc': { ids: [], styleClass: 'svg-active' },
    'param-re': { ids: ['cc-svg-re', 'cc-svg-re-text'], styleClass: 'svg-active' },
    'param-beta': { ids: ['cc-svg-q1-circle', 'cc-svg-q1-base', 'cc-svg-q1-collector', 'cc-svg-q1-emitter', 'cc-svg-q1-arrow', 'cc-svg-q1-text'], styleClass: 'svg-active' },
    'param-ce': { ids: [], styleClass: 'svg-active' },
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
// Motor Matemático del Transistor BJT — Cascada Multietapa
// ==========================================================================
function runBjtSimulation() {
  // 1. Obtener valores comunes
  const Vcc = parseFloat(inputs.vcc.value);
  const Vin = (parseFloat(inputs.vin.value) / 1000);
  const freqSlider = parseFloat(inputs.freq.value);
  const frequency = Math.pow(10, freqSlider);
  const Rl = parseFloat(inputs.rl.value) * 1000;
  const Cc = parseFloat(inputs.cc.value) * 1e-6; // Cc en Faradios

  // 2. Obtener valores de la Etapa 1
  const R1_1 = parseFloat(inputs.r1.value) * 1000;
  const R2_1 = parseFloat(inputs.r2.value) * 1000;
  const Rc_1 = parseFloat(inputs.rc.value) * 1000;
  const Re_1 = parseFloat(inputs.re.value) * 1000;
  const beta_1 = parseFloat(inputs.beta.value);
  const Ce_1 = inputs.ce.checked;

  // 3. Obtener valores de la Etapa 2
  const R1_2 = parseFloat(inputs.r1_2.value) * 1000;
  const R2_2 = parseFloat(inputs.r2_2.value) * 1000;
  const Rc_2 = parseFloat(inputs.rc_2.value) * 1000;
  const Re_2 = parseFloat(inputs.re_2.value) * 1000;
  const beta_2 = parseFloat(inputs.beta_2.value);
  const Ce_2 = inputs.ce_2.checked;

  // --- POLARIZACIÓN DC: ETAPA 2 ---
  const Vth2 = Vcc * (R2_2 / (R1_2 + R2_2));
  const Rth2 = (R1_2 * R2_2) / (R1_2 + R2_2);
  
  let Ib2 = 0, Ic2 = 0, Ie2 = 0, Ve2 = 0, Vc2 = Vcc, Vce2 = Vcc, state2 = 'CORTE';

  if (Vth2 >= V_BE) {
    Ib2 = (Vth2 - V_BE) / (Rth2 + (beta_2 + 1) * Re_2);
    Ic2 = beta_2 * Ib2;
    Ie2 = (beta_2 + 1) * Ib2;
    Ve2 = Ie2 * Re_2;
    state2 = 'ACTIVA';

    if (activeConfig2 === 'CC') {
      Vc2 = Vcc;
      Vce2 = Vcc - Ve2;
    } else {
      Vc2 = Vcc - Ic2 * Rc_2;
      Vce2 = Vc2 - Ve2;
    }

    // Comprobar saturación
    if (Vce2 < V_CE_SAT) {
      state2 = 'SATURACIÓN';
      if (activeConfig2 === 'CC') {
        Ie2 = (Vcc - V_CE_SAT) / Re_2;
        Ic2 = Ie2;
        Ib2 = Ic2 / beta_2;
        Ve2 = Ie2 * Re_2;
        Vc2 = Vcc;
        Vce2 = V_CE_SAT;
      } else {
        Ic2 = (Vcc - V_CE_SAT) / (Rc_2 + Re_2);
        Ie2 = Ic2;
        Ib2 = Ic2 / beta_2;
        Ve2 = Ic2 * Re_2;
        Vc2 = Ve2 + V_CE_SAT;
        Vce2 = V_CE_SAT;
      }
    }
  }

  // --- ANÁLISIS AC: ETAPA 2 (Cargada por Rl) ---
  let re2 = Infinity;
  let Zin2 = Rth2;
  let Av2_mid = 0;
  
  if (state2 === 'ACTIVA' && Ic2 > 0) {
    re2 = V_T / Ic2;
    
    switch (activeConfig2) {
      case 'CE': {
        const rc2_ac = parallel(Rc_2, Rl);
        if (Ce_2) {
          const Zbase2 = beta_2 * re2;
          Zin2 = parallel(Rth2, Zbase2);
          Av2_mid = -(rc2_ac / re2);
        } else {
          const Zbase2 = beta_2 * (re2 + Re_2);
          Zin2 = parallel(Rth2, Zbase2);
          Av2_mid = -(rc2_ac / (re2 + Re_2));
        }
        break;
      }
      case 'CC': {
        const re2_ac = parallel(Re_2, Rl);
        const Zbase2 = beta_2 * (re2 + re2_ac);
        Zin2 = parallel(Rth2, Zbase2);
        Av2_mid = re2_ac / (re2 + re2_ac);
        break;
      }
      case 'CB': {
        const rc2_ac = parallel(Rc_2, Rl);
        Zin2 = parallel(Re_2, re2);
        Av2_mid = rc2_ac / re2;
        break;
      }
    }
  } else {
    Zin2 = (activeConfig2 === 'CB') ? parallel(Re_2, 1e6) : Rth2;
  }

  // --- POLARIZACIÓN DC: ETAPA 1 ---
  const Vth1 = Vcc * (R2_1 / (R1_1 + R2_1));
  const Rth1 = (R1_1 * R2_1) / (R1_1 + R2_1);
  
  let Ib1 = 0, Ic1 = 0, Ie1 = 0, Ve1 = 0, Vc1 = Vcc, Vce1 = Vcc, state1 = 'CORTE';

  if (Vth1 >= V_BE) {
    Ib1 = (Vth1 - V_BE) / (Rth1 + (beta_1 + 1) * Re_1);
    Ic1 = beta_1 * Ib1;
    Ie1 = (beta_1 + 1) * Ib1;
    Ve1 = Ie1 * Re_1;
    state1 = 'ACTIVA';

    if (activeConfig1 === 'CC') {
      Vc1 = Vcc;
      Vce1 = Vcc - Ve1;
    } else {
      Vc1 = Vcc - Ic1 * Rc_1;
      Vce1 = Vc1 - Ve1;
    }

    // Comprobar saturación
    if (Vce1 < V_CE_SAT) {
      state1 = 'SATURACIÓN';
      if (activeConfig1 === 'CC') {
        Ie1 = (Vcc - V_CE_SAT) / Re_1;
        Ic1 = Ie1;
        Ib1 = Ic1 / beta_1;
        Ve1 = Ie1 * Re_1;
        Vc1 = Vcc;
        Vce1 = V_CE_SAT;
      } else {
        Ic1 = (Vcc - V_CE_SAT) / (Rc_1 + Re_1);
        Ie1 = Ic1;
        Ib1 = Ic1 / beta_1;
        Ve1 = Ic1 * Re_1;
        Vc1 = Ve1 + V_CE_SAT;
        Vce1 = V_CE_SAT;
      }
    }
  }

  // --- ANÁLISIS AC: ETAPA 1 (Cargada por Zin2 si hay 2 etapas) ---
  const R_load1 = (numStages === 2) ? Zin2 : Rl;
  let re1 = Infinity;
  let Zin1 = Rth1;
  let Av1_mid = 0;

  if (state1 === 'ACTIVA' && Ic1 > 0) {
    re1 = V_T / Ic1;
    
    switch (activeConfig1) {
      case 'CE': {
        const rc1_ac = parallel(Rc_1, R_load1);
        if (Ce_1) {
          const Zbase1 = beta_1 * re1;
          Zin1 = parallel(Rth1, Zbase1);
          Av1_mid = -(rc1_ac / re1);
        } else {
          const Zbase1 = beta_1 * (re1 + Re_1);
          Zin1 = parallel(Rth1, Zbase1);
          Av1_mid = -(rc1_ac / (re1 + Re_1));
        }
        break;
      }
      case 'CC': {
        const re1_ac = parallel(Re_1, R_load1);
        const Zbase1 = beta_1 * (re1 + re1_ac);
        Zin1 = parallel(Rth1, Zbase1);
        Av1_mid = re1_ac / (re1 + re1_ac);
        break;
      }
      case 'CB': {
        const rc1_ac = parallel(Rc_1, R_load1);
        Zin1 = parallel(Re_1, re1);
        Av1_mid = rc1_ac / re1;
        break;
      }
    }
  } else {
    Zin1 = (activeConfig1 === 'CB') ? parallel(Re_1, 1e6) : Rth1;
  }

  // --- GANANCIA DE BANDA MEDIA GLOBAL ---
  const Rg = 600;
  const Att1 = Zin1 / (Rg + Zin1);
  let Av_mid = Att1 * Av1_mid;
  if (numStages === 2) {
    Av_mid *= Av2_mid;
  }

  // --- ANÁLISIS EN FRECUENCIA (Baja y Alta Frecuencia) ---
  const C1 = 10e-6;
  const C2 = 4.7e-6;
  const Ce_val = 47e-6;
  const Cb_val = 47e-6;

  // Polos Etapa 1
  const fL1 = 1 / (2 * Math.PI * C1 * (Rg + Zin1));
  
  let fLe1 = 0;
  if (state1 === 'ACTIVA' && re1 !== Infinity) {
    if (activeConfig1 === 'CE' && Ce_1) {
      const Req_e1 = parallel(Re_1, re1 + (parallel(Rth1, Rg) / beta_1));
      fLe1 = 1 / (2 * Math.PI * Ce_val * Req_e1);
    } else if (activeConfig1 === 'CB') {
      const Rbase_cb1 = parallel(R1_1, R2_1);
      fLe1 = 1 / (2 * Math.PI * Cb_val * (Rbase_cb1 / (beta_1 + 1)));
    }
  }

  // Resistencia de salida Etapa 1
  let Rout1 = Rc_1;
  if (activeConfig1 === 'CC') {
    Rout1 = parallel(Re_1, re1 + (parallel(Rth1, Rg) / beta_1));
  }

  // Polos alta frecuencia Etapa 1
  const Cbe = 25e-12;
  const Cbc = 5e-12;
  let fH1 = Infinity;

  if (state1 === 'ACTIVA') {
    const Req_H1 = parallel(Rg, Rth1);
    if (activeConfig1 === 'CE') {
      const CM1 = Cbc * (1 + Math.abs(Av1_mid));
      fH1 = 1 / (2 * Math.PI * Req_H1 * (Cbe + CM1));
    } else if (activeConfig1 === 'CC') {
      const CM1 = Cbc * (1 - Av1_mid);
      fH1 = 1 / (2 * Math.PI * Req_H1 * (Cbe + CM1));
    } else if (activeConfig1 === 'CB') {
      fH1 = 1 / (2 * Math.PI * parallel(Rg, Zin1) * Cbe);
    }
  }

  // Polos Etapa 2 (Si aplica)
  let fL2 = 0, fLe2 = 0, fL_c = 0;
  let fH2 = Infinity;

  if (numStages === 1) {
    fL2 = 1 / (2 * Math.PI * C2 * (Rout1 + Rl));
  } else {
    // Polo del acoplamiento Cc
    fL_c = 1 / (2 * Math.PI * Cc * (Rout1 + Zin2));
    
    // Polo de salida Etapa 2
    let Rout2 = Rc_2;
    if (activeConfig2 === 'CC') {
      Rout2 = parallel(Re_2, re2 + (parallel(Rth2, Rout1) / beta_2));
    }
    fL2 = 1 / (2 * Math.PI * C2 * (Rout2 + Rl));

    // Polo de bypass Etapa 2
    if (state2 === 'ACTIVA' && re2 !== Infinity) {
      if (activeConfig2 === 'CE' && Ce_2) {
        const Req_e2 = parallel(Re_2, re2 + (parallel(Rth2, Rout1) / beta_2));
        fLe2 = 1 / (2 * Math.PI * Ce_val * Req_e2);
      } else if (activeConfig2 === 'CB') {
        const Rbase_cb2 = parallel(R1_2, R2_2);
        fLe2 = 1 / (2 * Math.PI * Cb_val * (Rbase_cb2 / (beta_2 + 1)));
      }
    }

    // Polo alta frecuencia Etapa 2
    if (state2 === 'ACTIVA') {
      const Req_H2 = parallel(Rout1, Rth2);
      if (activeConfig2 === 'CE') {
        const CM2 = Cbc * (1 + Math.abs(Av2_mid));
        fH2 = 1 / (2 * Math.PI * Req_H2 * (Cbe + CM2));
      } else if (activeConfig2 === 'CC') {
        const CM2 = Cbc * (1 - Av2_mid);
        fH2 = 1 / (2 * Math.PI * Req_H2 * (Cbe + CM2));
      } else if (activeConfig2 === 'CB') {
        fH2 = 1 / (2 * Math.PI * parallel(Rout1, Zin2) * Cbe);
      }
    }
  }

  // --- POLOS ACUMULADOS ---
  // Etapa 1 Total Low-Pass / High-Pass
  const fL1_total = Math.sqrt(fL1*fL1 + fLe1*fLe1 + fL_c*fL_c);
  const lowPassFactor1 = 1 / Math.sqrt(1 + Math.pow(frequency / fH1, 2));
  const highPassFactor1 = 1 / Math.sqrt(1 + Math.pow(fL1_total / frequency, 2));
  const phaseShift1 = Math.atan(fL1_total / frequency) - Math.atan(frequency / fH1);

  // Etapa 2 Total Low-Pass / High-Pass
  const fL2_total = Math.sqrt(fL2*fL2 + fLe2*fLe2);
  const lowPassFactor2 = numStages === 2 ? 1 / Math.sqrt(1 + Math.pow(frequency / fH2, 2)) : 1;
  const highPassFactor2 = numStages === 2 ? 1 / Math.sqrt(1 + Math.pow(fL2_total / frequency, 2)) : 1;
  const phaseShift2 = numStages === 2 ? (Math.atan(fL2_total / frequency) - Math.atan(frequency / fH2)) : 0;

  // Totales del sistema
  const fL = Math.sqrt(fL1*fL1 + fLe1*fLe1 + fL_c*fL_c + fL2*fL2 + fLe2*fLe2);
  const fH = numStages === 1 ? fH1 : 1 / Math.sqrt((1/(fH1*fH1)) + (1/(fH2*fH2)));
  
  const lowPassFactor = 1 / Math.sqrt(1 + Math.pow(frequency / fH, 2));
  const highPassFactor = 1 / Math.sqrt(1 + Math.pow(fL / frequency, 2));
  const Av = Av_mid * lowPassFactor * highPassFactor;
  const totalPhaseDeg = (Math.atan(fL / frequency) - Math.atan(frequency / fH)) * (180 / Math.PI);

  // Guardar datos en el estado global
  simData = {
    Vcc, Vin, frequency, Rl, Cc, fL, fH, Av, totalPhaseDeg, numStages,
    // Etapa 1
    R1_1, R2_1, Rc_1, Re_1, beta_1, Ce_1, activeConfig1,
    Vth1, Rth1, Ib1, Ic1, Ie1, Ve1, Vc1, Vce1, state1, re1, Zin1, Av1_mid, Rout1,
    fL1_total, fH1, lowPassFactor1, highPassFactor1, phaseShift1,
    // Etapa 2
    R1_2, R2_2, Rc_2, Re_2, beta_2, Ce_2, activeConfig2,
    Vth2, Rth2, Ib2, Ic2, Ie2, Ve2, Vc2, Vce2, state2, re2, Zin2, Av2_mid,
    fL2_total, fH2, lowPassFactor2, highPassFactor2, phaseShift2,
  };

  // Actualizar visualizaciones del DOM
  updateDmmReadouts();
}

// Helper para paralelo de resistencias
function parallel(r1, r2) {
  if (r1 === 0 || r2 === 0) return 0;
  if (r1 === Infinity) return r2;
  if (r2 === Infinity) return r1;
  return (r1 * r2) / (r1 + r2);
}

// ==========================================================================
// Actualización del DOM (Lecturas Digitales)
// ==========================================================================
function updateDmmReadouts() {
  // 1. Parámetros comunes
  readouts.vcc.textContent = `${simData.Vcc} V`;
  readouts.vin.textContent = `${inputs.vin.value} mV`;
  
  const f = simData.frequency;
  if (f < 1000) {
    readouts.freq.textContent = `${f.toFixed(0)} Hz`;
  } else {
    readouts.freq.textContent = `${(f / 1000).toFixed(2)} kHz`;
  }
  
  readouts.rl.textContent = `${inputs.rl.value} kΩ`;
  if (readouts.cc) {
    readouts.cc.textContent = `${parseFloat(inputs.cc.value).toFixed(1)} µF`;
  }

  // 2. Parámetros de la Etapa 1
  readouts.r1.textContent = `${inputs.r1.value} kΩ`;
  readouts.r2.textContent = `${inputs.r2.value} kΩ`;
  readouts.rc.textContent = `${inputs.rc.value} kΩ`;
  readouts.re.textContent = `${inputs.re.value} kΩ`;
  readouts.beta.textContent = `${simData.beta_1}`;

  // 3. Parámetros de la Etapa 2
  if (readouts.r1_2) readouts.r1_2.textContent = `${inputs.r1_2.value} kΩ`;
  if (readouts.r2_2) readouts.r2_2.textContent = `${inputs.r2_2.value} kΩ`;
  if (readouts.rc_2) readouts.rc_2.textContent = `${inputs.rc_2.value} kΩ`;
  if (readouts.re_2) readouts.re_2.textContent = `${inputs.re_2.value} kΩ`;
  if (readouts.beta_2) readouts.beta_2.textContent = `${simData.beta_2}`;

  // 4. Actualizar Digital Multi-Meter (DMM) - Refleja la pestaña de controles seleccionada
  const isTab1 = activeStageTab === 1;
  const Vce_active = isTab1 ? simData.Vce1 : simData.Vce2;
  const Ic_active = isTab1 ? simData.Ic1 : simData.Ic2;

  // Cambiar etiquetas de DMM dinámicamente
  const vceqLabel = document.querySelector('.metrics-grid .metric-box:nth-child(1) .metric-title');
  if (vceqLabel) vceqLabel.textContent = `Voltaje Vce Reposo (Vceq${activeStageTab})`;
  const icqLabel = document.querySelector('.metrics-grid .metric-box:nth-child(2) .metric-title');
  if (icqLabel) icqLabel.textContent = `Corriente Colector (Icq${activeStageTab})`;

  readouts.vceq.innerHTML = `${Vce_active.toFixed(2)}<span class="metric-unit">V</span>`;
  readouts.icq.innerHTML = `${(Ic_active * 1000).toFixed(2)}<span class="metric-unit">mA</span>`;
  
  // Total Gain
  let avDisplay;
  if (simData.Av === 0) {
    avDisplay = "0.0";
  } else {
    // Si hay inversión de fase de señal, se añade el signo negativo
    let isTotalInverted = false;
    if (numStages === 1) {
      isTotalInverted = simData.activeConfig1 === 'CE';
    } else {
      const inv1 = simData.activeConfig1 === 'CE';
      const inv2 = simData.activeConfig2 === 'CE';
      isTotalInverted = inv1 !== inv2; // XOR
    }
    
    if (isTotalInverted) {
      avDisplay = `-${Math.abs(simData.Av).toFixed(1)}`;
    } else {
      avDisplay = `+${Math.abs(simData.Av).toFixed(1)}`;
    }
  }

  const fHDisplay = simData.fH >= 1e6 
    ? `${(simData.fH/1e6).toFixed(1)}MHz`
    : `${(simData.fH/1000).toFixed(0)}kHz`;
  
  const avBreakdown = numStages === 2 
    ? `Av1: ${simData.Av1_mid.toFixed(0)}x | Av2: ${simData.Av2_mid.toFixed(1)}x`
    : `Ganancia etapa única`;

  readouts.av.innerHTML = `${avDisplay}<span class="metric-unit">x</span>
    <div style="font-size: 0.62rem; color: var(--text-dim); margin-top: 3px; font-weight: 500; font-family: var(--font-sans); line-height: 1.2;">
      Frec: ${simData.fL.toFixed(0)}Hz - ${fHDisplay}<br>${avBreakdown}
    </div>`;

  // Zin (impedancia de entrada global)
  const zinK = simData.Zin1 / 1000;
  if (zinK >= 1) {
    readouts.zin.innerHTML = `${zinK.toFixed(2)}<span class="metric-unit">kΩ</span>`;
  } else {
    readouts.zin.innerHTML = `${simData.Zin1.toFixed(1)}<span class="metric-unit">Ω</span>`;
  }

  // 5. Actualizar leyendas y controles de escala de osciloscopio 1 y 2
  const legendInput = document.getElementById('legend-input-label');
  if (legendInput) {
    legendInput.textContent = (simData.activeConfig1 === 'CB') ? 'Entrada Vin (x5)' : 'Entrada Vin (x20)';
  }

  const voutScaleVal = inputs.voutScale ? inputs.voutScale.value : '1';
  const valVoutScale = document.getElementById('val-vout-scale');
  if (valVoutScale) valVoutScale.textContent = `${voutScaleVal}x`;
  
  const legendOutput = document.getElementById('legend-output-label');
  if (legendOutput) {
    legendOutput.textContent = voutScaleVal === '1' ? 'Salida Vout1 (Real)' : `Salida Vout1 (x${voutScaleVal})`;
  }

  if (numStages === 2) {
    const legendInput2 = document.getElementById('legend-input-label-2');
    if (legendInput2) {
      legendInput2.textContent = (simData.activeConfig1 === 'CB') ? 'Entrada Vin (x5)' : 'Entrada Vin (x20)';
    }

    const voutScaleVal2 = inputVoutScale2 ? inputVoutScale2.value : '1';
    if (readoutVoutScale2) readoutVoutScale2.textContent = `${voutScaleVal2}x`;

    if (legendOutput2) {
      legendOutput2.textContent = voutScaleVal2 === '1' ? 'Salida Vout2 (Real)' : `Salida Vout2 (x${voutScaleVal2})`;
    }
  }
}

// ==========================================================================
// RENDERIZADO GRÁFICO: Recta de Carga DC (Etapa 1 o Etapa 2)
// ==========================================================================
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
  
  // Dibujar Grilla
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
  
  // Ejes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, h - padB);
  ctx.lineTo(w - padR, h - padB);
  ctx.stroke();
  
  if (!simData.Vcc) return;

  // Cargar variables según la etapa a graficar
  const stageNum = activeLoadlineStage;
  const Vce_s = stageNum === 1 ? simData.Vce1 : simData.Vce2;
  const Ic_s = stageNum === 1 ? simData.Ic1 : simData.Ic2;
  const activeConfig_s = stageNum === 1 ? simData.activeConfig1 : simData.activeConfig2;
  const Rc_s = stageNum === 1 ? simData.Rc_1 : simData.Rc_2;
  const Re_s = stageNum === 1 ? simData.Re_1 : simData.Re_2;
  const Ve_s = stageNum === 1 ? simData.Ve1 : simData.Ve2;
  const Vc_s = stageNum === 1 ? simData.Vc1 : simData.Vc2;
  const Vth_s = stageNum === 1 ? simData.Vth1 : simData.Vth2;
  const state_s = stageNum === 1 ? simData.state1 : simData.state2;

  let RloadDC;
  if (activeConfig_s === 'CC') {
    RloadDC = Re_s;
  } else {
    RloadDC = Rc_s + Re_s;
  }
  
  const maxIcCalc = simData.Vcc / RloadDC;
  const scaleV = simData.Vcc * 1.2;
  const scaleI = maxIcCalc * 1.3 * 1000;
  
  const mapX = (v) => padL + (v / scaleV) * graphW;
  const mapY = (iMa) => (h - padB) - (iMa / scaleI) * graphH;
  
  // Eje X Etiquetas
  ctx.fillStyle = 'rgba(148, 163, 184, 1)';
  ctx.font = '10px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let v = 0; v <= scaleV; v += Math.ceil(scaleV / 5)) {
    if (v <= simData.Vcc * 1.1) {
      ctx.fillText(`${v.toFixed(0)}V`, mapX(v), h - padB + 8);
    }
  }
  ctx.fillText(`Vce (${stageNum === 1 ? 'Etapa 1' : 'Etapa 2'})`, padL + graphW / 2, h - 16);
  
  // Eje Y Etiquetas
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= scaleI; i += Math.ceil(scaleI / 5)) {
    ctx.fillText(`${i.toFixed(1)}`, padL - 8, mapY(i));
  }
  
  ctx.save();
  ctx.translate(15, padT + graphH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Ic (mA)', 0, 0);
  ctx.restore();
  
  // Recta de Carga DC
  const icMaxMa = (simData.Vcc / RloadDC) * 1000;
  const vceMaxV = simData.Vcc;
  
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(mapX(0), mapY(icMaxMa));
  ctx.lineTo(mapX(vceMaxV), mapY(0));
  ctx.stroke();
  
  // Resplandor ciberpunk
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#ff007f';
  ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  
  // Dibujar punto Q
  const qX = mapX(Vce_s);
  const qY = mapY(Ic_s * 1000);
  
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
  
  // Barrido AC Dinámico (Oscilación)
  if (state_s === 'ACTIVA') {
    const omega = 2 * Math.PI * 1;
    const dynamicOffset = Math.sin(animationTime * omega);
    const Att1 = simData.Zin1 / (600 + simData.Zin1);
    
    let vinAmp;
    if (stageNum === 1) {
      vinAmp = Att1 * simData.Vin;
    } else {
      // Entrada a la Etapa 2 es la salida de la Etapa 1 filtrada
      const vOut1_peak = Att1 * simData.Vin * Math.abs(simData.Av1_mid);
      // Aplicar clipping Stage 1
      let vOut1_clipped;
      if (simData.activeConfig1 === 'CC') {
        const veMax = simData.Vcc - V_CE_SAT;
        const vMax = veMax - simData.Ve1;
        const vMin = -simData.Ve1;
        vOut1_clipped = Math.max(vMin, Math.min(vMax, vOut1_peak));
      } else {
        const vcMin = (simData.activeConfig1 === 'CB') ? Math.max(simData.Ve1 + V_CE_SAT, simData.Vth1) : simData.Ve1 + V_CE_SAT;
        const vMax = simData.Vcc - simData.Vc1;
        const vMin = vcMin - simData.Vc1;
        vOut1_clipped = Math.max(vMin, Math.min(vMax, vOut1_peak));
      }
      vinAmp = vOut1_clipped * simData.highPassFactor1 * simData.lowPassFactor1;
    }
    
    const vOutIdeal = vinAmp * (stageNum === 1 ? simData.Av1_mid : simData.Av2_mid) * dynamicOffset;
    
    let vOutReal = 0;
    if (activeConfig_s === 'CC') {
      let veAbs = Ve_s + vOutIdeal;
      const veMax = simData.Vcc - V_CE_SAT;
      veAbs = Math.max(0, Math.min(veMax, veAbs));
      vOutReal = veAbs - Ve_s;
    } else {
      let vcAbs = Vc_s + vOutIdeal;
      const vcMin = (activeConfig_s === 'CB') ? Math.max(Ve_s + V_CE_SAT, Vth_s) : Ve_s + V_CE_SAT;
      vcAbs = Math.max(vcMin, Math.min(simData.Vcc, vcAbs));
      vOutReal = vcAbs - Vc_s;
    }
    
    // Ecuaciones de carga dinámica
    let vceInst, icInstMa;
    if (activeConfig_s === 'CC') {
      const veInst = Ve_s + vOutReal;
      vceInst = simData.Vcc - veInst;
      icInstMa = (veInst / Re_s) * 1000;
    } else {
      const vcInst = Vc_s + vOutReal;
      vceInst = vcInst - Ve_s;
      icInstMa = ((simData.Vcc - vceInst) / RloadDC) * 1000;
    }
    
    const instX = mapX(vceInst);
    const instY = mapY(icInstMa);
    
    // Dibujar la trayectoria AC
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    
    // Puntos extremos
    const extVouts = [
      vinAmp * (stageNum === 1 ? simData.Av1_mid : simData.Av2_mid),
      -vinAmp * (stageNum === 1 ? simData.Av1_mid : simData.Av2_mid)
    ];
    
    const extPts = extVouts.map(vout => {
      let vReal = 0;
      if (activeConfig_s === 'CC') {
        vReal = Math.max(0, Math.min(simData.Vcc - V_CE_SAT, Ve_s + vout)) - Ve_s;
      } else {
        const vcMin = (activeConfig_s === 'CB') ? Math.max(Ve_s + V_CE_SAT, Vth_s) : Ve_s + V_CE_SAT;
        vReal = Math.max(vcMin, Math.min(simData.Vcc, Vc_s + vout)) - Vc_s;
      }
      
      let vceVal, icValMa;
      if (activeConfig_s === 'CC') {
        const veVal = Ve_s + vReal;
        vceVal = simData.Vcc - veVal;
        icValMa = (veVal / Re_s) * 1000;
      } else {
        const vcVal = Vc_s + vReal;
        vceVal = vcVal - Ve_s;
        icValMa = ((simData.Vcc - vceVal) / RloadDC) * 1000;
      }
      return { x: mapX(vceVal), y: mapY(icValMa) };
    });
    
    ctx.moveTo(extPts[0].x, extPts[0].y);
    ctx.lineTo(extPts[1].x, extPts[1].y);
    ctx.stroke();
    
    // Punto móvil de animación
    ctx.fillStyle = '#00f2fe';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f2fe';
    ctx.beginPath();
    ctx.arc(instX, instY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
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
  ctx.fillText(` Punto Q${stageNum}`, qX + 8, qY - 4);
}

// ==========================================================================
// RENDERIZADO GRÁFICO: Osciloscopio 1 (Vin vs Vout1)
// ==========================================================================
function drawOscilloscope() {
  const canvas = canvases.oscilloscope;
  const ctx = ctxs.oscilloscope;
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.clearRect(0, 0, w, h);
  
  // Grilla
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const divX = 10, divY = 6;
  for (let i = 1; i < divX; i++) {
    const x = (w * i) / divX;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let i = 1; i < divY; i++) {
    const y = (h * i) / divY;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  
  // Eje
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  
  if (!simData.Vcc) return;
  
  const scaleFactorY = (h * 0.4) / (simData.Vcc / 2);
  const points = w;
  const frequencyHz = 2;
  let isClippingDetected = false;
  
  // 1. Entrada Vin
  const viewInputAmplifier = (simData.activeConfig1 === 'CB') ? 5 : 20;
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < points; x++) {
    const timeRatio = x / points;
    const angle = 2 * Math.PI * frequencyHz * timeRatio - (animationTime * 2 * Math.PI);
    const vInScaled = simData.Vin * Math.sin(angle) * viewInputAmplifier;
    const yPixel = h / 2 - (vInScaled * scaleFactorY);
    if (x === 0) ctx.moveTo(x, yPixel);
    else ctx.lineTo(x, yPixel);
  }
  ctx.stroke();
  
  // 2. Salida Vout1
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 2.5;
  ctx.save();
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#ff007f';
  ctx.beginPath();
  
  const phase1 = simData.phaseShift1;
  const hpf1 = simData.highPassFactor1;
  const lpf1 = simData.lowPassFactor1;
  const Att1 = simData.Zin1 / (600 + simData.Zin1);

  for (let x = 0; x < points; x++) {
    const timeRatio = x / points;
    const angle = 2 * Math.PI * frequencyHz * timeRatio - (animationTime * 2 * Math.PI);
    
    const angle_sh1 = angle + phase1;
    const vIn1 = Att1 * simData.Vin * Math.sin(angle_sh1);
    const vOut1_ideal = vIn1 * simData.Av1_mid;
    
    let vOut1_clipped = 0;
    if (simData.activeConfig1 === 'CC') {
      let veAbs = simData.Ve1 + vOut1_ideal;
      const veMax = simData.Vcc - V_CE_SAT;
      if (veAbs > veMax) { veAbs = veMax; isClippingDetected = true; }
      if (veAbs < 0) { veAbs = 0; isClippingDetected = true; }
      vOut1_clipped = veAbs - simData.Ve1;
    } else if (simData.activeConfig1 === 'CB') {
      let vcAbs = simData.Vc1 + vOut1_ideal;
      const vcMin = Math.max(simData.Ve1 + V_CE_SAT, simData.Vth1);
      if (vcAbs > simData.Vcc) { vcAbs = simData.Vcc; isClippingDetected = true; }
      if (vcAbs < vcMin) { vcAbs = vcMin; isClippingDetected = true; }
      vOut1_clipped = vcAbs - simData.Vc1;
    } else { // CE
      let vcAbs = simData.Vc1 + vOut1_ideal;
      const vcMin = simData.Ve1 + V_CE_SAT;
      if (vcAbs > simData.Vcc) { vcAbs = simData.Vcc; isClippingDetected = true; }
      if (vcAbs < vcMin) { vcAbs = vcMin; isClippingDetected = true; }
      vOut1_clipped = vcAbs - simData.Vc1;
    }
    
    const vOut1_final = vOut1_clipped * hpf1 * lpf1;
    const visualScale = inputs.voutScale ? parseFloat(inputs.voutScale.value) : 1;
    const yPixel = h / 2 - (vOut1_final * scaleFactorY * visualScale);
    
    if (x === 0) ctx.moveTo(x, yPixel);
    else ctx.lineTo(x, yPixel);
  }
  ctx.stroke();
  ctx.restore();
  
  if (readouts.clippingIndicator) {
    readouts.clippingIndicator.style.display = isClippingDetected ? 'inline-flex' : 'none';
  }
}

// ==========================================================================
// RENDERIZADO GRÁFICO: Osciloscopio 2 (Vin vs Vout2)
// ==========================================================================
function drawOscilloscope2() {
  if (numStages !== 2 || !ctxs.oscilloscope2) return;
  
  const canvas = canvases.oscilloscope2;
  const ctx = ctxs.oscilloscope2;
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.clearRect(0, 0, w, h);
  
  // Grilla
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const divX = 10, divY = 6;
  for (let i = 1; i < divX; i++) {
    const x = (w * i) / divX;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let i = 1; i < divY; i++) {
    const y = (h * i) / divY;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  
  // Eje
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  
  if (!simData.Vcc) return;
  
  const scaleFactorY = (h * 0.4) / (simData.Vcc / 2);
  const points = w;
  const frequencyHz = 2;
  let isClippingDetected = false;
  
  // 1. Entrada Vin
  const viewInputAmplifier = (simData.activeConfig1 === 'CB') ? 5 : 20;
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < points; x++) {
    const timeRatio = x / points;
    const angle = 2 * Math.PI * frequencyHz * timeRatio - (animationTime * 2 * Math.PI);
    const vInScaled = simData.Vin * Math.sin(angle) * viewInputAmplifier;
    const yPixel = h / 2 - (vInScaled * scaleFactorY);
    if (x === 0) ctx.moveTo(x, yPixel);
    else ctx.lineTo(x, yPixel);
  }
  ctx.stroke();
  
  // 2. Salida Vout2 (Global)
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 2.5;
  ctx.save();
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#ff007f';
  ctx.beginPath();
  
  const phase1 = simData.phaseShift1;
  const phase2 = simData.phaseShift2;
  const hpf1 = simData.highPassFactor1;
  const lpf1 = simData.lowPassFactor1;
  const hpf2 = simData.highPassFactor2;
  const lpf2 = simData.lowPassFactor2;
  const Att1 = simData.Zin1 / (600 + simData.Zin1);

  for (let x = 0; x < points; x++) {
    const timeRatio = x / points;
    const angle = 2 * Math.PI * frequencyHz * timeRatio - (animationTime * 2 * Math.PI);
    
    // Calcular tensión AC acumulando el desfase total para el cálculo dinámico
    const angle_sh2 = angle + phase1 + phase2;
    const vIn1 = Att1 * simData.Vin * Math.sin(angle_sh2);
    const vOut1_ideal = vIn1 * simData.Av1_mid;
    
    // Clipping de la Etapa 1
    let vOut1_clipped = 0;
    if (simData.activeConfig1 === 'CC') {
      let veAbs = simData.Ve1 + vOut1_ideal;
      const veMax = simData.Vcc - V_CE_SAT;
      veAbs = Math.max(0, Math.min(veMax, veAbs));
      vOut1_clipped = veAbs - simData.Ve1;
    } else {
      let vcAbs = simData.Vc1 + vOut1_ideal;
      const vcMin = (simData.activeConfig1 === 'CB') ? Math.max(simData.Ve1 + V_CE_SAT, simData.Vth1) : simData.Ve1 + V_CE_SAT;
      vcAbs = Math.max(vcMin, Math.min(simData.Vcc, vcAbs));
      vOut1_clipped = vcAbs - simData.Vc1;
    }
    
    // La salida de la etapa 1 filtrada se inyecta en la entrada de la etapa 2
    const vOut1_final = vOut1_clipped * hpf1 * lpf1;
    const vOut2_ideal = vOut1_final * simData.Av2_mid;
    
    // Clipping de la Etapa 2
    let vOut2_clipped = 0;
    if (simData.activeConfig2 === 'CC') {
      let veAbs = simData.Ve2 + vOut2_ideal;
      const veMax = simData.Vcc - V_CE_SAT;
      if (veAbs > veMax) { veAbs = veMax; isClippingDetected = true; }
      if (veAbs < 0) { veAbs = 0; isClippingDetected = true; }
      vOut2_clipped = veAbs - simData.Ve2;
    } else if (simData.activeConfig2 === 'CB') {
      let vcAbs = simData.Vc2 + vOut2_ideal;
      const vcMin = Math.max(simData.Ve2 + V_CE_SAT, simData.Vth2);
      if (vcAbs > simData.Vcc) { vcAbs = simData.Vcc; isClippingDetected = true; }
      if (vcAbs < vcMin) { vcAbs = vcMin; isClippingDetected = true; }
      vOut2_clipped = vcAbs - simData.Vc2;
    } else { // CE
      let vcAbs = simData.Vc2 + vOut2_ideal;
      const vcMin = simData.Ve2 + V_CE_SAT;
      if (vcAbs > simData.Vcc) { vcAbs = simData.Vcc; isClippingDetected = true; }
      if (vcAbs < vcMin) { vcAbs = vcMin; isClippingDetected = true; }
      vOut2_clipped = vcAbs - simData.Vc2;
    }
    
    const vOut2_final = vOut2_clipped * hpf2 * lpf2;
    const visualScale = inputVoutScale2 ? parseFloat(inputVoutScale2.value) : 1;
    const yPixel = h / 2 - (vOut2_final * scaleFactorY * visualScale);
    
    if (x === 0) ctx.moveTo(x, yPixel);
    else ctx.lineTo(x, yPixel);
  }
  ctx.stroke();
  ctx.restore();
  
  if (clippingIndicator2) {
    clippingIndicator2.style.display = isClippingDetected ? 'inline-flex' : 'none';
  }
}

// ==========================================================================
// Bucle de Animación Dinámica (60 FPS)
// ==========================================================================
function animationLoop() {
  animationTime += 0.005;
  drawLoadLine();
  drawOscilloscope();
  drawOscilloscope2();
  requestAnimationFrame(animationLoop);
}

// ==========================================================================
// Cambio de Topología (Desde el header selector)
// ==========================================================================
function switchTopology(topo) {
  if (numStages === 1) {
    activeConfig1 = topo;
  } else {
    if (activeStageTab === 1) {
      activeConfig1 = topo;
    } else {
      activeConfig2 = topo;
    }
  }

  // Actualizar textos de las pestañas
  const tabBtn1 = document.querySelector('.stage-tab-btn[data-stage="1"]');
  const tabBtn2 = document.querySelector('.stage-tab-btn[data-stage="2"]');
  if (tabBtn1) tabBtn1.textContent = `Etapa 1 (${activeConfig1})`;
  if (tabBtn2) tabBtn2.textContent = `Etapa 2 (${activeConfig2})`;

  // Actualizar título del esquema
  if (numStages === 1) {
    const titles = {
      CE: 'Esquema: Emisor Común (CE)',
      CC: 'Esquema: Colector Común (CC)',
      CB: 'Esquema: Base Común (CB)',
    };
    schematicTitle.textContent = titles[topo];
  } else {
    schematicTitle.textContent = `Esquema Cascada: ${activeConfig1} + ${activeConfig2}`;
  }

  // Conmutar botones activos del selector del header
  updateHeaderTopologySelector(topo);

  // Sincronizar visibilidad de esquemas SVG
  updateSvgVisibility();

  // Habilitar/deshabilitar controles según topología
  updateControlStates();

  // Re-correr simulación
  runBjtSimulation();
}

function updateHeaderTopologySelector(topo) {
  topoTabs.forEach(tab => {
    if (tab.dataset.topo === topo) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    } else {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    }
  });
}

function updateSvgVisibility() {
  // Etapa 1 SVGs
  Object.entries(svgContainers).forEach(([key, svg]) => {
    if (key === activeConfig1) {
      svg.classList.add('active');
    } else {
      svg.classList.remove('active');
    }
  });

  // Etapa 2 SVGs
  Object.entries(svgContainers2).forEach(([key, svg]) => {
    if (key === activeConfig2 && numStages === 2) {
      svg.classList.add('active');
    } else {
      svg.classList.remove('active');
    }
  });
}

function updateControlStates() {
  // --- ETAPA 1 ---
  if (ctrlRc) {
    if (activeConfig1 === 'CC') {
      ctrlRc.classList.add('control-disabled');
    } else {
      ctrlRc.classList.remove('control-disabled');
    }
  }
  if (ctrlCeSwitch) {
    const label = ctrlCeSwitch.querySelector('.switch-label');
    if (activeConfig1 === 'CC') {
      ctrlCeSwitch.classList.add('control-disabled');
    } else if (activeConfig1 === 'CB') {
      ctrlCeSwitch.classList.remove('control-disabled');
      if (label) label.textContent = 'Bypass de Base (Cb)';
    } else {
      ctrlCeSwitch.classList.remove('control-disabled');
      if (label) label.textContent = 'Bypass de Emisor (Ce)';
    }
  }

  // --- ETAPA 2 ---
  const ctrlRc2 = document.getElementById('ctrl-rc-2');
  const ctrlCeSwitch2 = document.getElementById('ctrl-ce-switch-2');
  if (ctrlRc2) {
    if (activeConfig2 === 'CC') {
      ctrlRc2.classList.add('control-disabled');
    } else {
      ctrlRc2.classList.remove('control-disabled');
    }
  }
  if (ctrlCeSwitch2) {
    const label = ctrlCeSwitch2.querySelector('.switch-label');
    if (activeConfig2 === 'CC') {
      ctrlCeSwitch2.classList.add('control-disabled');
    } else if (activeConfig2 === 'CB') {
      ctrlCeSwitch2.classList.remove('control-disabled');
      if (label) label.textContent = 'Bypass de Base (Cb)';
    } else {
      ctrlCeSwitch2.classList.remove('control-disabled');
      if (label) label.textContent = 'Bypass de Emisor (Ce)';
    }
  }
}

// ==========================================================================
// Controladores de Eventos e Interactividad
// ==========================================================================
function setupControls() {
  Object.values(inputs).forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        runBjtSimulation();
        Object.values(presets).forEach(btn => btn.classList.remove('active'));
      });
    }
  });
  
  setupSvgHighlighting();
}

function setupSvgHighlighting() {
  const allControlIds = Object.keys(svgMappings.CE);
  
  // Hover para sliders de la etapa 1 y comunes
  allControlIds.forEach(controlId => {
    const element = document.getElementById(controlId);
    if (!element) return;
    
    const highlight = (active) => {
      const mapping = svgMappings[activeConfig1];
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

  // Hover para sliders de la etapa 2 (sufijo -2)
  allControlIds.forEach(baseControlId => {
    // Si el control base es común, no tiene duplicado -2
    if (['param-vcc', 'param-vin', 'param-freq', 'param-rl', 'param-cc'].includes(baseControlId)) return;
    
    const controlId2 = `${baseControlId}-2`;
    const element = document.getElementById(controlId2);
    if (!element) return;
    
    const highlight = (active) => {
      const mapping = svgMappings[activeConfig2];
      if (!mapping || !mapping[baseControlId]) return;
      
      const svgData = mapping[baseControlId];
      svgData.ids.forEach(baseId => {
        const id2 = `${baseId}-2`;
        const svgEl = document.getElementById(id2);
        if (svgEl) {
          if (active) {
            svgEl.classList.add('svg-active-2'); // Usamos rosa para etapa 2
          } else {
            svgEl.classList.remove('svg-active-2');
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

// Configuración de las pestañas internas de etapas, selector 1 vs 2 etapas, etc.
function setupStageControls() {
  // 1. Selector de número de etapas (1 o 2) en el header
  const stageBtns = document.querySelectorAll('.stage-btn');
  stageBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      stageBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Inline styles a juego con index.html
      stageBtns.forEach(b => {
        if (b.classList.contains('active')) {
          b.style.background = 'var(--accent-cyan)';
          b.style.color = '#060813';
          b.style.textShadow = '0 0 5px rgba(0,242,254,0.3)';
        } else {
          b.style.background = 'transparent';
          b.style.color = 'var(--text-dim)';
          b.style.textShadow = 'none';
        }
      });

      const stages = parseInt(btn.dataset.stages);
      setNumStages(stages);
    });
  });

  // 2. Conmutador de pestañas de control (Etapa 1 / Etapa 2)
  const stageTabBtns = document.querySelectorAll('.stage-tab-btn');
  stageTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      stageTabBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.borderLeftColor = 'transparent';
        b.style.color = 'var(--text-dim)';
      });
      btn.classList.add('active');
      
      const stage = parseInt(btn.dataset.stage);
      activeStageTab = stage;

      if (stage === 1) {
        btn.style.background = 'rgba(0, 242, 254, 0.1)';
        btn.style.borderLeftColor = 'var(--accent-cyan)';
        btn.style.color = 'var(--accent-cyan)';
      } else {
        btn.style.background = 'rgba(255, 0, 127, 0.1)';
        btn.style.borderLeftColor = 'var(--accent-pink)';
        btn.style.color = 'var(--accent-pink)';
      }

      // Mostrar/ocultar sliders según pestaña
      if (stage === 1) {
        controlsStage1.style.display = 'block';
        controlsStage2.style.display = 'none';
      } else {
        controlsStage1.style.display = 'none';
        controlsStage2.style.display = 'block';
      }

      // Sincronizar el selector de topología del header
      const currentConfig = stage === 1 ? activeConfig1 : activeConfig2;
      updateHeaderTopologySelector(currentConfig);

      // Re-correr simulación para refrescar DMM
      runBjtSimulation();
    });
  });

  // 3. Conmutador de recta de carga (Etapa 1 / Etapa 2)
  const loadlineBtns = document.querySelectorAll('.loadline-btn');
  loadlineBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      loadlineBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-dim)';
      });
      btn.classList.add('active');
      
      const stage = parseInt(btn.dataset.stage);
      activeLoadlineStage = stage;

      if (stage === 1) {
        btn.style.background = 'var(--accent-pink)';
        btn.style.color = '#fff';
      } else {
        btn.style.background = 'var(--accent-cyan)';
        btn.style.color = '#060813';
      }

      // Forzar re-dibujado de recta de carga
      drawLoadLine();
    });
  });
}

function setNumStages(stages) {
  numStages = stages;
  
  if (stages === 1) {
    if (stageTabsWrapper) stageTabsWrapper.style.display = 'none';
    if (controlsStage2) controlsStage2.style.display = 'none';
    if (controlsStage1) controlsStage1.style.display = 'block';
    if (ctrlCc) ctrlCc.style.display = 'none';
    if (schematicStage2) schematicStage2.style.display = 'none';
    if (schematicConnector) schematicConnector.style.display = 'none';
    if (cardOscilloscope2) cardOscilloscope2.style.display = 'none';
    if (loadlineSelectWrapper) loadlineSelectWrapper.style.display = 'none';
    
    schematicTitle.textContent = `Esquema: ${activeConfig1 === 'CE' ? 'Emisor Común (CE)' : activeConfig1 === 'CC' ? 'Colector Común (CC)' : 'Base Común (CB)'}`;
    
    activeStageTab = 1;
    activeLoadlineStage = 1;
  } else {
    if (stageTabsWrapper) stageTabsWrapper.style.display = 'flex';
    if (ctrlCc) ctrlCc.style.display = 'block';
    if (schematicStage2) schematicStage2.style.display = 'block';
    if (schematicConnector) schematicConnector.style.display = 'flex';
    if (cardOscilloscope2) cardOscilloscope2.style.display = 'block';
    if (loadlineSelectWrapper) loadlineSelectWrapper.style.display = 'flex';
    
    if (activeStageTab === 1) {
      if (controlsStage1) controlsStage1.style.display = 'block';
      if (controlsStage2) controlsStage2.style.display = 'none';
    } else {
      if (controlsStage1) controlsStage1.style.display = 'none';
      if (controlsStage2) controlsStage2.style.display = 'block';
    }
    
    schematicTitle.textContent = `Esquema Cascada: ${activeConfig1} + ${activeConfig2}`;
  }

  // Refrescar textos en las pestañas
  const tabBtn1 = document.querySelector('.stage-tab-btn[data-stage="1"]');
  const tabBtn2 = document.querySelector('.stage-tab-btn[data-stage="2"]');
  if (tabBtn1) tabBtn1.textContent = `Etapa 1 (${activeConfig1})`;
  if (tabBtn2) tabBtn2.textContent = `Etapa 2 (${activeConfig2})`;

  // Sincronizar el header topology selector
  const currentConfig = activeStageTab === 1 ? activeConfig1 : activeConfig2;
  updateHeaderTopologySelector(currentConfig);

  // Asegurar que las SVGs correctas estén visibles
  updateSvgVisibility();

  // Habilitar/deshabilitar controles según topología
  updateControlStates();

  // Re-ejecutar simulación
  runBjtSimulation();
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
  const isStage1Active = (activeStageTab === 1);
  const currentTopology = isStage1Active ? activeConfig1 : activeConfig2;
  const p = presetValues[currentTopology]?.[key];
  if (!p) return;
  
  // Actualizar los inputs de la etapa activa
  if (isStage1Active) {
    inputs.r1.value = p.r1;
    inputs.r2.value = p.r2;
    inputs.rc.value = p.rc;
    inputs.re.value = p.re;
    inputs.beta.value = p.beta;
    inputs.ce.checked = p.ce;
  } else {
    inputs.r1_2.value = p.r1;
    inputs.r2_2.value = p.r2;
    inputs.rc_2.value = p.rc;
    inputs.re_2.value = p.re;
    inputs.beta_2.value = p.beta;
    inputs.ce_2.checked = p.ce;
  }

  // Los parámetros comunes se actualizan siempre
  inputs.vcc.value = p.vcc;
  inputs.vin.value = p.vin;
  inputs.freq.value = p.freq;
  inputs.rl.value = p.rl;
  
  // Resetear la escala de osciloscopio
  if (inputs.voutScale) inputs.voutScale.value = 1;
  if (inputVoutScale2) inputVoutScale2.value = 1;

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
// Configuración de Pestañas de Topología (Header)
// ==========================================================================
function setupTopologyTabs() {
  topoTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTopology(tab.dataset.topo);
      // Resetear presets
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
  setupStageControls();

  // Inicializar estado por defecto
  activeConfig1 = 'CE';
  activeConfig2 = 'CC';
  setNumStages(1); // Empieza en 1 etapa por defecto
  applyPreset('audio');
  
  // Iniciar bucle de renderizado animado continuo
  animationLoop();
});
