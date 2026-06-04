/**
 * BJT Multi-Topology, Multi-Stage Amplifier Simulator
 * Motor matemático de simulación, renderizado Canvas y lógica de interfaz
 * Soporta 1 o 2 etapas, cada una con topología CE, CC o CB independiente.
 */

// ==========================================================================
// Constantes Físicas
// ==========================================================================
const V_BE = 0.7;
const V_CE_SAT = 0.2;
const V_T = 0.025;

// ==========================================================================
// Estado Global
// ==========================================================================
let numStages = 1;
let activeTopology = ['CE', 'CE']; // topología de cada etapa [stage1, stage2]
let simData = [{}, {}];            // resultados de simulación por etapa
let animationTime = 0;
let activePresetKey = 'audio';

// ==========================================================================
// Referencias DOM
// ==========================================================================

// Sliders e inputs por etapa (índice 0 = etapa 1, índice 1 = etapa 2)
function getInputs(s) {
  // s = 0 o 1
  const prefix = s === 0 ? 's1' : 's2';
  return {
    vcc:  document.getElementById(`${prefix}-vcc`),
    r1:   document.getElementById(`${prefix}-r1`),
    r2:   document.getElementById(`${prefix}-r2`),
    rc:   document.getElementById(`${prefix}-rc`),
    re:   document.getElementById(`${prefix}-re`),
    beta: document.getElementById(`${prefix}-beta`),
    ce:   document.getElementById(`${prefix}-ce`),
    c1:   document.getElementById(`${prefix}-c1`),
    // freq y vin solo en etapa 1
    vin:  s === 0 ? document.getElementById('s1-vin')  : null,
    freq: s === 0 ? document.getElementById('s1-freq') : null,
    rl:   s === 0 ? document.getElementById('s1-rl2')  : document.getElementById('s2-rl'),
    voutScale: document.getElementById(`${prefix}-vout-scale`),
  };
}

function getReadouts(s) {
  const prefix = s === 0 ? 's1' : 's2';
  return {
    vcc:  document.getElementById(`${prefix}-val-vcc`),
    r1:   document.getElementById(`${prefix}-val-r1`),
    r2:   document.getElementById(`${prefix}-val-r2`),
    rc:   document.getElementById(`${prefix}-val-rc`),
    re:   document.getElementById(`${prefix}-val-re`),
    beta: document.getElementById(`${prefix}-val-beta`),
    c1:   document.getElementById(`${prefix}-val-c1`),
    vin:  s === 0 ? document.getElementById('s1-val-vin')  : null,
    freq: s === 0 ? document.getElementById('s1-val-freq') : null,
    rl:   s === 0 ? document.getElementById('s1-val-rl2')  : document.getElementById(`${prefix}-val-rl`),
    vceq: document.getElementById(`${prefix}-val-vceq`),
    icq:  document.getElementById(`${prefix}-val-icq`),
    av:   document.getElementById(`${prefix}-val-av`),
    zin:  document.getElementById(`${prefix}-val-zin`),
    statusContainer: document.getElementById(`${prefix}-status-container`),
    statusText: document.getElementById(`${prefix}-status-text`),
    clipping: document.getElementById(`${prefix}-clipping`),
    voutScaleVal: document.getElementById(`${prefix}-val-vout-scale`),
    legendInput:  s === 0 ? document.getElementById('s1-legend-input') : null,
    legendOutput: document.getElementById(`${prefix}-legend-output`),
  };
}

function getCanvases(s) {
  const suffix = s + 1;
  return {
    loadline:     document.getElementById(`canvas-ll-${suffix}`),
    oscilloscope: document.getElementById(`canvas-osc-${suffix}`),
  };
}

// Presets
const presets = {
  audio:    document.getElementById('preset-audio'),
  gain:     document.getElementById('preset-gain'),
  stable:   document.getElementById('preset-stable'),
  saturate: document.getElementById('preset-saturate'),
};

// Botones de número de etapas
const stageButtons = document.querySelectorAll('.stage-btn');

// Seleccion topología
const topoTabSets = [
  document.querySelectorAll('.topology-selector[data-stage="1"] .topo-tab'),
  document.querySelectorAll('.topology-selector[data-stage="2"] .topo-tab'),
];

// SVG containers por etapa y topología
const svgSets = [
  { CE: document.getElementById('s1-svg-ce'), CC: document.getElementById('s1-svg-cc'), CB: document.getElementById('s1-svg-cb') },
  { CE: document.getElementById('s2-svg-ce'), CC: document.getElementById('s2-svg-cc'), CB: document.getElementById('s2-svg-cb') },
];

// Labels
const topoLabels = [
  document.getElementById('s1-topo-label'),
  document.getElementById('s2-topo-label'),
];

// ==========================================================================
// Motor Matemático — simula 1 etapa
// ==========================================================================
function parallel(r1, r2) {
  if (r1 === 0 || r2 === 0) return 0;
  return (r1 * r2) / (r1 + r2);
}

/**
 * Simula una etapa BJT y devuelve el objeto simData para esa etapa.
 * @param {number} stageIdx  índice 0 o 1
 * @param {number} vinAC     amplitud de la señal AC de entrada (V)
 * @param {number} frequency frecuencia de la señal AC (Hz)
 * @param {number} zinNext   impedancia de entrada de la etapa siguiente (Ω), Infinity si no hay
 */
function simulateStage(stageIdx, vinAC, frequency, zinNext) {
  const topo = activeTopology[stageIdx];
  const inputs = getInputs(stageIdx);

  const Vcc  = parseFloat(inputs.vcc.value);
  const R1   = parseFloat(inputs.r1.value) * 1000;
  const R2   = parseFloat(inputs.r2.value) * 1000;
  const Rc   = parseFloat(inputs.rc.value) * 1000;
  const Re   = parseFloat(inputs.re.value) * 1000;
  const beta = parseFloat(inputs.beta.value);
  const Ce   = inputs.ce.checked;
  const C1   = inputs.c1 ? parseFloat(inputs.c1.value) * 1e-6 : 10e-6;
  const Rl   = isFinite(zinNext) ? parallel(parseFloat(inputs.rl.value) * 1000, zinNext)
                                 : parseFloat(inputs.rl.value) * 1000;
  const Vin  = vinAC;

  // -- DC Bias --
  const Vth = Vcc * (R2 / (R1 + R2));
  const Rth = parallel(R1, R2);

  let Ib = 0, Ic = 0, Ie = 0, Ve = 0, Vc = Vcc, Vce = Vcc;
  let state = 'ACTIVA';

  if (Vth < V_BE) {
    state = 'CORTE';
  } else {
    Ib  = (Vth - V_BE) / (Rth + (beta + 1) * Re);
    Ic  = beta * Ib;
    Ie  = (beta + 1) * Ib;
    Ve  = Ie * Re;
    if (topo === 'CC') {
      Vc  = Vcc;
      Vce = Vcc - Ve;
    } else {
      Vc  = Vcc - Ic * Rc;
      Vce = Vc - Ve;
    }
    if (Vce < V_CE_SAT) {
      state = 'SATURACIÓN';
      if (topo === 'CC') {
        Ie = (Vcc - V_CE_SAT) / Re;
        Ic = Ie; Ib = Ic / beta; Ve = Ie * Re; Vc = Vcc; Vce = V_CE_SAT;
      } else {
        Ic = (Vcc - V_CE_SAT) / (Rc + Re);
        Ie = Ic; Ib = Ic / beta; Ve = Ic * Re; Vc = Ve + V_CE_SAT; Vce = V_CE_SAT;
      }
    }
  }

  // -- AC Small Signal --
  let re_intrinsic = Infinity, Zin = Rth, Av = 0, AvMid = 0, isInverted = false;

  if (state === 'ACTIVA' && Ic > 0) {
    re_intrinsic = V_T / Ic;
    switch (topo) {
      case 'CE': {
        const rc_ac = parallel(Rc, Rl);
        isInverted = true;
        if (Ce) {
          Zin   = parallel(Rth, beta * re_intrinsic);
          AvMid = -(rc_ac / re_intrinsic);
        } else {
          Zin   = parallel(Rth, beta * (re_intrinsic + Re));
          AvMid = -(rc_ac / (re_intrinsic + Re));
        }
        break;
      }
      case 'CC': {
        const re_rl = parallel(Re, Rl);
        isInverted = false;
        Zin   = parallel(Rth, beta * (re_intrinsic + re_rl));
        AvMid = re_rl / (re_intrinsic + re_rl);
        break;
      }
      case 'CB': {
        const rc_ac = parallel(Rc, Rl);
        isInverted = false;
        Zin   = parallel(Re, re_intrinsic);
        AvMid = rc_ac / re_intrinsic;
        break;
      }
    }
  } else {
    AvMid = 0;
    Zin = (topo === 'CB') ? parallel(Re, 1e6) : Rth;
  }

  // Respuesta en frecuencia
  const C1_val = C1;  // valor leído del slider
  const C2 = 4.7e-6, Ce_val = 47e-6, Cb_val = 47e-6, Rg = 600;
  let fL1, fL2, fLe = 0;

  switch (topo) {
    case 'CE':
      fL1 = 1 / (2 * Math.PI * C1_val * (Rg + Zin));
      fL2 = 1 / (2 * Math.PI * C2 * (Rc + Rl));
      if (Ce && state === 'ACTIVA' && re_intrinsic !== Infinity) {
        const Req_e = parallel(Re, re_intrinsic + (parallel(Rth, Rg) / beta));
        fLe = 1 / (2 * Math.PI * Ce_val * Req_e);
      }
      break;
    case 'CC':
      fL1 = 1 / (2 * Math.PI * C1_val * (Rg + Zin));
      fL2 = 1 / (2 * Math.PI * C2 * (parallel(Re, re_intrinsic + parallel(Rth, Rg) / beta) + Rl));
      break;
    case 'CB':
      fL1 = 1 / (2 * Math.PI * C1_val * (Rg + Zin));
      fL2 = 1 / (2 * Math.PI * C2 * (Rc + Rl));
      if (state === 'ACTIVA' && re_intrinsic !== Infinity) {
        fLe = 1 / (2 * Math.PI * Cb_val * (parallel(R1, R2) / (beta + 1)));
      }
      break;
  }

  const fL = Math.sqrt(fL1 * fL1 + fL2 * fL2 + fLe * fLe);

  const Cbe = 25e-12, Cbc = 5e-12;
  let fH;
  switch (topo) {
    case 'CE':
    case 'CC': {
      const CM = Cbc * (1 + Math.abs(AvMid));
      const Cin_H = Cbe + CM;
      fH = 1 / (2 * Math.PI * parallel(Rg, Rth) * Cin_H);
      break;
    }
    case 'CB':
      fH = 1 / (2 * Math.PI * parallel(Rg, Zin) * Cbe);
      break;
  }

  const lowPassFactor  = 1 / Math.sqrt(1 + Math.pow(frequency / fH, 2));
  const highPassFactor = 1 / Math.sqrt(1 + Math.pow(fL / frequency, 2));
  Av = AvMid * lowPassFactor * highPassFactor;

  const thetaL = Math.atan(fL / frequency);
  const thetaH = -Math.atan(frequency / fH);
  const phaseShiftDeg = (thetaL + thetaH) * (180 / Math.PI);

  return {
    topo, Vcc, R1, R2, Rc, Re, beta, Ce, Vin, Rl,
    Vth, Rth, Ib, Ic, Ie, Ve, Vc, Vce, state,
    re: re_intrinsic, Zin, Av, AvMid, isInverted,
    frequency, fL, fH, phaseShiftDeg,
  };
}

// ==========================================================================
// Simulación completa (1 o 2 etapas)
// ==========================================================================
function runSimulation() {
  const inp0 = getInputs(0);
  const Vin0    = parseFloat(inp0.vin.value) / 1000;
  const freqSlider = parseFloat(inp0.freq.value);
  const frequency  = Math.pow(10, freqSlider);

  if (numStages === 1) {
    // Rl directa desde s1-rl2
    simData[0] = simulateStage(0, Vin0, frequency, Infinity);
    simData[1] = null;
  } else {
    // Primero calcular Zin de etapa 2 (provisional, sin carga de E1)
    // Para obtener Zin de E2 necesitamos simularla provisionalmente
    const rl2 = parseFloat(document.getElementById('s2-rl').value) * 1000;
    const provisional2 = simulateStage(1, Vin0, frequency, Infinity);
    const zin2 = provisional2.Zin;

    // Ahora simular etapa 1 con carga = Zin de etapa 2 || Rl de E1
    const rl1 = parseFloat(document.getElementById('s1-rl2').value) * 1000;
    // En modo 2 etapas, E1 ve como carga a Zin2
    simData[0] = simulateStage(0, Vin0, frequency, zin2);

    // Señal de salida de la etapa 1 es la entrada de la etapa 2
    const vout1 = Math.abs(simData[0].Av) * Vin0;
    simData[1] = simulateStage(1, vout1, frequency, Infinity);
  }

  updateAllReadouts();
}

// ==========================================================================
// Actualización de lecturas DOM
// ==========================================================================
function updateAllReadouts() {
  for (let s = 0; s < (numStages); s++) {
    updateReadouts(s);
  }
}

function updateReadouts(s) {
  const d = simData[s];
  if (!d) return;
  const inp = getInputs(s);
  const ro  = getReadouts(s);

  if (ro.vcc)  ro.vcc.textContent  = `${d.Vcc} V`;
  if (ro.r1)   ro.r1.textContent   = `${inp.r1.value} kΩ`;
  if (ro.r2)   ro.r2.textContent   = `${inp.r2.value} kΩ`;
  if (ro.rc)   ro.rc.textContent   = `${inp.rc.value} kΩ`;
  if (ro.re)   ro.re.textContent   = `${inp.re.value} kΩ`;
  if (ro.beta) ro.beta.textContent = `${d.beta}`;
  if (ro.rl)   ro.rl.textContent   = `${inp.rl ? inp.rl.value : '—'} kΩ`;
  // C1
  if (ro.c1 && inp.c1) {
    const c1v = parseFloat(inp.c1.value);
    ro.c1.textContent = c1v < 1 ? `${(c1v * 1000).toFixed(0)} nF` : `${c1v.toFixed(1)} µF`;
  }

  if (s === 0 && ro.vin) {
    ro.vin.textContent = `${inp.vin.value} mV`;
    const f = d.frequency;
    if (f >= 1e6)       ro.freq.textContent = `${(f/1e6).toFixed(2)} MHz`;
    else if (f >= 1000) ro.freq.textContent = `${(f/1000).toFixed(2)} kHz`;
    else                ro.freq.textContent = `${f.toFixed(0)} Hz`;
  }

  // DMM
  ro.vceq.innerHTML = `${d.Vce.toFixed(2)}<span class="metric-unit">V</span>`;
  ro.icq.innerHTML  = `${(d.Ic * 1000).toFixed(2)}<span class="metric-unit">mA</span>`;

  let avDisplay;
  if (d.state === 'ACTIVA') {
    if (d.isInverted) {
      avDisplay = d.Av.toFixed(1);
    } else {
      avDisplay = `+${d.Av.toFixed(d.topo === 'CC' ? 3 : 1)}`;
    }
    const fHDisplay = d.fH >= 1e6
      ? `${(d.fH/1e6).toFixed(2)}MHz`
      : d.fH >= 1000
        ? `${(d.fH/1000).toFixed(0)}kHz`
        : `${d.fH.toFixed(0)}Hz`;
    const fLDisplay = d.fL < 1
      ? `${d.fL.toFixed(2)}Hz`
      : d.fL >= 1000
        ? `${(d.fL/1000).toFixed(1)}kHz`
        : `${d.fL.toFixed(1)}Hz`;

    // Para la etapa 2, mostrar la ganancia total
    let avLabel = avDisplay;
    if (s === 1 && simData[0]) {
      const avTotal = simData[0].Av * d.Av;
      avLabel = avTotal.toFixed(1);
    }

    ro.av.innerHTML = `${avLabel}<span class="metric-unit">x</span>
      <div style="font-size:0.55rem;color:var(--text-dim);margin-top:2px;font-weight:500;">
        ${fLDisplay}–${fHDisplay}
      </div>`;
  } else {
    ro.av.innerHTML = `0.0<span class="metric-unit">x</span>`;
  }

  const zinK = d.Zin / 1000;
  ro.zin.innerHTML = zinK >= 1
    ? `${zinK.toFixed(2)}<span class="metric-unit">kΩ</span>`
    : `${d.Zin.toFixed(1)}<span class="metric-unit">Ω</span>`;

  // Estado
  if (ro.statusContainer) {
    ro.statusContainer.className = 'status-indicator';
    if (d.state === 'ACTIVA') {
      ro.statusContainer.classList.add('status-active');
      ro.statusText.textContent = s === 0 ? 'E1: Activa' : 'E2: Activa';
    } else if (d.state === 'SATURACIÓN') {
      ro.statusContainer.classList.add('status-saturated');
      ro.statusText.textContent = s === 0 ? 'E1: Saturación' : 'E2: Saturación';
    } else {
      ro.statusContainer.classList.add('status-cutoff');
      ro.statusText.textContent = s === 0 ? 'E1: Corte' : 'E2: Corte';
    }
  }

  // Escala Vout
  if (inp.voutScale && ro.voutScaleVal) {
    ro.voutScaleVal.textContent = `${inp.voutScale.value}x`;
  }

  // Leyenda input
  if (ro.legendInput) {
    ro.legendInput.textContent = d.topo === 'CB' ? 'Vin (×5)' : 'Vin (×20)';
  }
}

// ==========================================================================
// RENDERIZADO — Recta de Carga DC
// ==========================================================================
function drawLoadLine(stageIdx) {
  const canvases = getCanvases(stageIdx);
  const canvas = canvases.loadline;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const d = simData[stageIdx];
  if (!d) return;

  // Sincronizar tamaño interno del canvas con el tamaño CSS
  canvas.width  = canvas.offsetWidth  || 400;
  canvas.height = canvas.offsetHeight || 160;

  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const padL = 42, padR = 10, padT = 12, padB = 30;
  const graphW = w - padL - padR;
  const graphH = h - padT - padB;

  // Cuadrícula
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  const gridN = 4;
  for (let i = 0; i <= gridN; i++) {
    const y = padT + (graphH * i) / gridN;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    const x = padL + (graphW * i) / gridN;
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, h - padB); ctx.stroke();
  }

  // Ejes
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, h - padB); ctx.lineTo(w - padR, h - padB); ctx.stroke();

  let RloadDC = d.topo === 'CC' ? d.Re : d.Rc + d.Re;
  const maxIcCalc = d.Vcc / RloadDC;
  const scaleV = d.Vcc * 1.2;
  const scaleI = maxIcCalc * 1.35 * 1000;

  const mapX = v => padL + (v / scaleV) * graphW;
  const mapY = iMa => (h - padB) - (iMa / scaleI) * graphH;

  // Etiquetas eje X
  ctx.fillStyle = 'rgba(148,163,184,0.85)';
  ctx.font = '9px JetBrains Mono';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const vStep = Math.ceil(scaleV / 4);
  for (let v = 0; v <= scaleV; v += vStep) {
    if (v <= d.Vcc * 1.1) ctx.fillText(`${v.toFixed(0)}V`, mapX(v), h - padB + 5);
  }
  ctx.fillText('Vce', padL + graphW / 2, h - 12);

  // Etiquetas eje Y
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const iStep = Math.ceil(scaleI / 4);
  for (let i = 0; i <= scaleI; i += iStep) {
    ctx.fillText(`${i.toFixed(0)}`, padL - 5, mapY(i));
  }
  ctx.save(); ctx.translate(10, padT + graphH / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center'; ctx.fillText('Ic(mA)', 0, 0);
  ctx.restore();

  // Recta de carga
  const icMaxMa = (d.Vcc / RloadDC) * 1000;
  ctx.strokeStyle = '#ff007f'; ctx.lineWidth = 2;
  ctx.shadowBlur = 6; ctx.shadowColor = '#ff007f';
  ctx.beginPath(); ctx.moveTo(mapX(0), mapY(icMaxMa)); ctx.lineTo(mapX(d.Vcc), mapY(0)); ctx.stroke();
  ctx.shadowBlur = 0;

  // Trayectoria AC
  if (d.state === 'ACTIVA' && d.Av !== 0) {
    const omega = 2 * Math.PI * 1;
    const dynamicOffset = Math.sin(animationTime * omega);
    const vinInst = d.Vin * dynamicOffset;
    const voutInstIdeal = d.Av * vinInst;

    let ext1Vce, ext2Vce, ext1IcMa, ext2IcMa, instVce, instIcMa;
    const voutMax = Math.abs(d.Av * d.Vin);

    if (d.topo === 'CC') {
      const veMin = 0, veMax = d.Vcc - V_CE_SAT;
      const e1Ve = Math.max(veMin, Math.min(veMax, d.Ve - voutMax));
      const e2Ve = Math.max(veMin, Math.min(veMax, d.Ve + voutMax));
      ext1Vce = d.Vcc - e1Ve; ext2Vce = d.Vcc - e2Ve;
      ext1IcMa = (e1Ve / d.Re) * 1000; ext2IcMa = (e2Ve / d.Re) * 1000;
      const veInst = Math.max(veMin, Math.min(veMax, d.Ve + voutInstIdeal));
      instVce = d.Vcc - veInst; instIcMa = (veInst / d.Re) * 1000;
    } else {
      const vcMin = d.Ve + V_CE_SAT, vcMax = d.Vcc;
      const e1Vc = Math.max(vcMin, Math.min(vcMax, d.Vc - voutMax));
      const e2Vc = Math.max(vcMin, Math.min(vcMax, d.Vc + voutMax));
      ext1Vce = e1Vc - d.Ve; ext2Vce = e2Vc - d.Ve;
      ext1IcMa = ((d.Vcc - ext1Vce) / RloadDC) * 1000;
      ext2IcMa = ((d.Vcc - ext2Vce) / RloadDC) * 1000;
      const vcInst = Math.max(vcMin, Math.min(vcMax, d.Vc + voutInstIdeal));
      instVce = vcInst - d.Ve; instIcMa = ((d.Vcc - instVce) / RloadDC) * 1000;
    }

    ctx.strokeStyle = 'rgba(0,242,254,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mapX(ext1Vce), mapY(ext1IcMa)); ctx.lineTo(mapX(ext2Vce), mapY(ext2IcMa)); ctx.stroke();

    ctx.fillStyle = '#00f2fe'; ctx.shadowBlur = 8; ctx.shadowColor = '#00f2fe';
    ctx.beginPath(); ctx.arc(mapX(instVce), mapY(instIcMa), 5, 0, 2 * Math.PI); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Punto Q estático
  const qX = mapX(d.Vce);
  const qY = mapY(d.Ic * 1000);

  // Líneas punteadas
  ctx.strokeStyle = 'rgba(255,183,0,0.25)'; ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(qX, qY); ctx.lineTo(qX, h - padB); ctx.moveTo(qX, qY); ctx.lineTo(padL, qY); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#ffb700'; ctx.beginPath(); ctx.arc(qX, qY, 5, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = '#060813'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#ffb700'; ctx.font = 'bold 8px Outfit, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(' Q', qX + 6, qY - 2);
}

// ==========================================================================
// RENDERIZADO — Osciloscopio
// ==========================================================================
function drawOscilloscope(stageIdx) {
  const canvases = getCanvases(stageIdx);
  const canvas = canvases.oscilloscope;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const d = simData[stageIdx];
  if (!d) return;

  canvas.width  = canvas.offsetWidth  || 400;
  canvas.height = canvas.offsetHeight || 160;

  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Cuadrícula fosforescente
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  const dX = 10, dY = 6;
  for (let i = 1; i < dX; i++) { ctx.beginPath(); ctx.moveTo(w*i/dX, 0); ctx.lineTo(w*i/dX, h); ctx.stroke(); }
  for (let i = 1; i < dY; i++) { ctx.beginPath(); ctx.moveTo(0, h*i/dY); ctx.lineTo(w, h*i/dY); ctx.stroke(); }

  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();

  const inp = getInputs(stageIdx);

  // Vin para el osciloscopio: etapa 1 usa Vin directo; etapa 2 muestra Vin original
  const vinDisplay = stageIdx === 0
    ? parseFloat(getInputs(0).vin.value) / 1000
    : parseFloat(getInputs(0).vin.value) / 1000;  // siempre mostramos la señal original como referencia

  const viewInputAmp = (d.topo === 'CB') ? 5 : 20;
  const scaleFactorY = (h * 0.4) / (d.Vcc / 2);
  const points = w;
  const freqHz = 2; // 2 ciclos en pantalla
  let isClipping = false;

  ctx.lineWidth = 1.5;

  // Señal de entrada (referencia) — siempre la Vin original de etapa 1
  ctx.strokeStyle = '#00f2fe';
  ctx.beginPath();
  for (let x = 0; x < points; x++) {
    const angle = 2 * Math.PI * freqHz * (x / points) - (animationTime * 2 * Math.PI);
    const vIn = vinDisplay * Math.sin(angle) * viewInputAmp;
    const yPixel = h / 2 - (vIn * scaleFactorY);
    x === 0 ? ctx.moveTo(x, yPixel) : ctx.lineTo(x, yPixel);
  }
  ctx.stroke();

  // Señal de salida
  ctx.strokeStyle = '#ff007f'; ctx.lineWidth = 2;
  ctx.save(); ctx.shadowBlur = 5; ctx.shadowColor = '#ff007f';
  ctx.beginPath();

  let totalAv = d.Av;
  let totalPhaseRad = d.phaseShiftDeg * Math.PI / 180;
  const Vin0 = parseFloat(getInputs(0).vin.value) / 1000;

  if (stageIdx === 1 && simData[0]) {
    totalAv = simData[0].Av * d.Av;
    totalPhaseRad = (simData[0].phaseShiftDeg + d.phaseShiftDeg) * Math.PI / 180;
  }

  const visualScale = inp.voutScale ? parseFloat(inp.voutScale.value) : 1;

  for (let x = 0; x < points; x++) {
    const angle = 2 * Math.PI * freqHz * (x / points) - (animationTime * 2 * Math.PI);
    const vOutIdeal = totalAv * Vin0 * Math.sin(angle + totalPhaseRad);
    let vOutRealAc;

    if (d.topo === 'CC') {
      let veAbs = d.Ve + vOutIdeal;
      const veMax = d.Vcc - V_CE_SAT, veMin = 0;
      if (veAbs > veMax) { veAbs = veMax; isClipping = true; }
      if (veAbs < veMin) { veAbs = veMin; isClipping = true; }
      vOutRealAc = veAbs - d.Ve;
    } else if (d.topo === 'CB') {
      let vcAbs = d.Vc + vOutIdeal;
      const vcMax = d.Vcc, vcMin = Math.max(d.Ve + V_CE_SAT, d.Vth);
      if (vcAbs > vcMax) { vcAbs = vcMax; isClipping = true; }
      if (vcAbs < vcMin) { vcAbs = vcMin; isClipping = true; }
      vOutRealAc = vcAbs - d.Vc;
    } else {
      let vcAbs = d.Vc + vOutIdeal;
      const vcMax = d.Vcc, vcMin = d.Ve + V_CE_SAT;
      if (vcAbs > vcMax) { vcAbs = vcMax; isClipping = true; }
      if (vcAbs < vcMin) { vcAbs = vcMin; isClipping = true; }
      vOutRealAc = vcAbs - d.Vc;
    }

    const yPixel = h / 2 - (vOutRealAc * scaleFactorY * visualScale);
    x === 0 ? ctx.moveTo(x, yPixel) : ctx.lineTo(x, yPixel);
  }
  ctx.stroke(); ctx.restore();

  // Clipping
  const ro = getReadouts(stageIdx);
  if (ro.clipping) ro.clipping.style.display = isClipping ? 'inline-flex' : 'none';
}

// ==========================================================================
// Bucle de Animación
// ==========================================================================
function animationLoop() {
  animationTime += 0.005;
  for (let s = 0; s < numStages; s++) {
    drawLoadLine(s);
    drawOscilloscope(s);
  }
  requestAnimationFrame(animationLoop);
}

// ==========================================================================
// Cambio de número de etapas
// ==========================================================================
function setNumStages(n) {
  numStages = n;

  // Botones de selección
  stageButtons.forEach(btn => {
    if (parseInt(btn.dataset.stages) === n) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Mostrar/ocultar E2 en params
  document.getElementById('params-stage2').style.display    = n === 2 ? '' : 'none';
  document.getElementById('params-divider').style.display   = n === 2 ? '' : 'none';
  document.getElementById('metrics-row-stage2').style.display = n === 2 ? '' : 'none';
  document.getElementById('s2-status-container').style.display = n === 2 ? '' : 'none';

  // Mostrar/ocultar E2 en gráficos
  document.getElementById('schematic-block-2').style.display  = n === 2 ? '' : 'none';
  document.getElementById('interstage-connector').style.display = n === 2 ? '' : 'none';
  document.getElementById('viz-block-2').style.display         = n === 2 ? '' : 'none';

  // Rl de la etapa 1 — en modo 2 etapas ocultamos el slider de Rl de E1
  // (porque la "Rl" de E1 será la Zin de E2)
  document.getElementById('s1-ctrl-rl').style.display = 'none'; // nunca visible (siempre ocultamos)

  runSimulation();
}

// ==========================================================================
// Cambio de topología
// ==========================================================================
function switchTopology(stageIdx, topo) {
  activeTopology[stageIdx] = topo;
  const prefix = stageIdx === 0 ? 's1' : 's2';

  // Actualizar tabs
  topoTabSets[stageIdx].forEach(tab => {
    if (tab.dataset.topo === topo) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    } else {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    }
  });

  // Conmutar SVG
  const svgSet = svgSets[stageIdx];
  Object.entries(svgSet).forEach(([key, svg]) => {
    if (svg) svg.classList.toggle('active', key === topo);
  });

  // Etiqueta
  const labels = { CE: 'Emisor Común (CE)', CC: 'Colector Común (CC)', CB: 'Base Común (CB)' };
  if (topoLabels[stageIdx]) topoLabels[stageIdx].textContent = labels[topo];

  // Habilitar/deshabilitar controles
  updateControlStates(stageIdx, topo);

  runSimulation();
}

function updateControlStates(stageIdx, topo) {
  const prefix = stageIdx === 0 ? 's1' : 's2';
  const ctrlRc = document.getElementById(`${prefix}-ctrl-rc`);
  const ctrlCe = document.getElementById(`${prefix}-ctrl-ce-switch`);
  const ceLabel = document.getElementById(`${prefix}-label-ce`);

  if (ctrlRc) ctrlRc.classList.toggle('control-disabled', topo === 'CC');

  if (ctrlCe) {
    if (topo === 'CC') {
      ctrlCe.classList.add('control-disabled');
    } else {
      ctrlCe.classList.remove('control-disabled');
      if (ceLabel) ceLabel.textContent = topo === 'CB' ? 'Bypass Cb' : 'Bypass Ce';
    }
  }
}

// ==========================================================================
// Presets
// ==========================================================================
const presetValues = {
  CE: {
    audio:    { vcc: 12, r1: 47, r2: 10, rc: 2.2, re: 0.68, beta: 200, ce: true,  vin: 40,  freq: 3.0, rl: 10 },
    gain:     { vcc: 15, r1:100, r2: 15, rc: 5.6, re: 0.47, beta: 300, ce: true,  vin: 15,  freq: 3.0, rl: 20 },
    stable:   { vcc: 12, r1: 33, r2: 12, rc: 1.5, re: 1.0,  beta: 150, ce: false, vin: 150, freq: 3.0, rl: 10 },
    saturate: { vcc: 9,  r1: 68, r2:  5, rc: 3.3, re: 0.22, beta: 250, ce: true,  vin: 180, freq: 3.0, rl: 10 },
  },
  CC: {
    audio:    { vcc: 12, r1: 47, r2: 22, rc: 2.2, re: 2.2, beta: 200, ce: false, vin: 100, freq: 3.0, rl: 4.7 },
    gain:     { vcc: 15, r1: 68, r2: 33, rc: 2.2, re: 3.3, beta: 300, ce: false, vin: 200, freq: 3.0, rl: 8.2 },
    stable:   { vcc: 12, r1: 33, r2: 15, rc: 2.2, re: 1.5, beta: 150, ce: false, vin: 300, freq: 3.0, rl: 10  },
    saturate: { vcc: 9,  r1:100, r2: 22, rc: 2.2, re: 1.0, beta: 250, ce: false, vin: 300, freq: 3.0, rl: 3   },
  },
  CB: {
    audio:    { vcc: 12, r1: 47, r2: 10, rc: 2.2, re: 0.68, beta: 200, ce: true,  vin: 20,  freq: 3.0, rl: 10 },
    gain:     { vcc: 15, r1:100, r2: 15, rc: 5.6, re: 0.47, beta: 300, ce: true,  vin: 10,  freq: 3.0, rl: 20 },
    stable:   { vcc: 12, r1: 33, r2: 12, rc: 1.5, re: 1.0,  beta: 150, ce: true,  vin: 50,  freq: 3.0, rl: 10 },
    saturate: { vcc: 9,  r1: 68, r2:  5, rc: 3.3, re: 0.22, beta: 250, ce: true,  vin: 100, freq: 3.0, rl: 10 },
  },
};

function applyPreset(key) {
  activePresetKey = key;

  for (let s = 0; s < 2; s++) {
    const topo = activeTopology[s];
    const p = presetValues[topo]?.[key];
    if (!p) continue;
    const prefix = s === 0 ? 's1' : 's2';

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };

    setVal(`${prefix}-vcc`, p.vcc);
    setVal(`${prefix}-r1`,  p.r1);
    setVal(`${prefix}-r2`,  p.r2);
    setVal(`${prefix}-rc`,  p.rc);
    setVal(`${prefix}-re`,  p.re);
    setVal(`${prefix}-beta`, p.beta);
    setChk(`${prefix}-ce`,  p.ce);
    if (s === 0) {
      setVal('s1-vin',  p.vin);
      setVal('s1-freq', p.freq);
    }
    setVal(`${prefix}-rl`, p.rl);
    setVal(`s${s+1}-rl2`, p.rl);  // también actualizar s1-rl2
  }

  Object.entries(presets).forEach(([k, btn]) => {
    btn.classList.toggle('active', k === key);
  });

  runSimulation();
}

// ==========================================================================
// Setup de Controles
// ==========================================================================
function setupAllControls() {
  // Botones de número de etapas
  stageButtons.forEach(btn => {
    btn.addEventListener('click', () => setNumStages(parseInt(btn.dataset.stages)));
  });

  // Tabs de topología
  for (let s = 0; s < 2; s++) {
    topoTabSets[s].forEach(tab => {
      tab.addEventListener('click', () => {
        switchTopology(parseInt(tab.dataset.stage) - 1, tab.dataset.topo);
      });
    });
  }

  // Presets
  Object.entries(presets).forEach(([key, btn]) => {
    btn.addEventListener('click', () => {
      applyPreset(key);
    });
  });

  // Sliders de E1
  const s1Ids = ['s1-vcc','s1-r1','s1-r2','s1-rc','s1-re','s1-beta','s1-ce','s1-vin','s1-freq','s1-rl','s1-rl2','s1-c1','s1-vout-scale'];
  s1Ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      Object.values(presets).forEach(b => b.classList.remove('active'));
      runSimulation();
    });
  });

  // Sliders de E2
  const s2Ids = ['s2-vcc','s2-r1','s2-r2','s2-rc','s2-re','s2-beta','s2-ce','s2-rl','s2-c1','s2-vout-scale'];
  s2Ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      Object.values(presets).forEach(b => b.classList.remove('active'));
      runSimulation();
    });
  });
}

// ==========================================================================
// Inicialización
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupAllControls();

  const btnExport = document.getElementById('btn-export-spice');
  if (btnExport) {
    btnExport.addEventListener('click', downloadSpiceFile);
  }

  // Estado inicial
  switchTopology(0, 'CE');
  switchTopology(1, 'CE');
  setNumStages(1);
  applyPreset('audio');

  // Iniciar animación
  animationLoop();
});

// ==========================================================================
// Exportación a SPICE (.cir)
// ==========================================================================
function generateSpiceNetlist() {
  let cir = "* =============================================================\n";
  cir += "* BJT Amplifier Playground - SPICE Netlist Export\n";
  cir += `* Etapas: ${numStages} | Topologias: ${activeTopology[0]}` + (numStages === 2 ? ` + ${activeTopology[1]}` : "") + "\n";
  cir += "* =============================================================\n\n";

  const i1 = getInputs(0);
  const vcc = parseFloat(i1.vcc.value);
  const vin = parseFloat(i1.vin.value) / 1000;
  const freq = Math.pow(10, parseFloat(i1.freq.value));
  const c1 = parseFloat(i1.c1.value) + "u";

  cir += "* ---- Fuente de alimentacion --------------------------------\n";
  cir += `Vcc  VCC  0   DC ${vcc}\n\n`;

  cir += "* ---- Senal de entrada senoidal ----------------------------\n";
  cir += `Vin  IN   0   SIN(0 ${vin} ${freq}) AC 1\n\n`;

  cir += "* ---- Condensador de entrada -------------------------------\n";
  
  // Nodos para E1
  const topo1 = activeTopology[0];
  let e1_in = topo1 === 'CB' ? 'E1' : 'B1';
  cir += `C1_1 IN   ${e1_in}   ${c1}\n\n`;

  cir += "* ---- Etapa 1 (" + topo1 + ") ----------------------------------------\n";
  cir += `R1_1 VCC  B1   ${parseFloat(i1.r1.value)}k\n`;
  cir += `R2_1 B1   0    ${parseFloat(i1.r2.value)}k\n`;
  if (topo1 !== 'CC') cir += `Rc_1 VCC  C1   ${parseFloat(i1.rc.value)}k\n`;
  else cir += `Rc_1 VCC  C1   0.001  ; puente ideal para CC\n`;
  cir += `Re_1 E1   0    ${parseFloat(i1.re.value)}k\n`;
  
  if (topo1 === 'CE' && i1.ce.checked) {
    cir += `Ce_1 E1   0    47u\n`;
  } else if (topo1 === 'CB') {
    cir += `Cb_1 B1   0    47u\n`;
  }

  cir += `Q1   C1   B1   E1   2N2222\n\n`;

  let last_out_node = topo1 === 'CC' ? 'E1' : 'C1';

  if (numStages === 2) {
    const i2 = getInputs(1);
    const topo2 = activeTopology[1];
    let e2_in = topo2 === 'CB' ? 'E2' : 'B2';
    const c1_2 = parseFloat(i2.c1.value) + "u";

    cir += "* ---- Acoplo interetapa ------------------------------------\n";
    cir += `C1_2 ${last_out_node}   ${e2_in}   ${c1_2}\n\n`;

    cir += "* ---- Etapa 2 (" + topo2 + ") ----------------------------------------\n";
    cir += `R1_2 VCC  B2   ${parseFloat(i2.r1.value)}k\n`;
    cir += `R2_2 B2   0    ${parseFloat(i2.r2.value)}k\n`;
    if (topo2 !== 'CC') cir += `Rc_2 VCC  C2   ${parseFloat(i2.rc.value)}k\n`;
    else cir += `Rc_2 VCC  C2   0.001  ; puente ideal para CC\n`;
    cir += `Re_2 E2   0    ${parseFloat(i2.re.value)}k\n`;

    if (topo2 === 'CE' && i2.ce.checked) {
      cir += `Ce_2 E2   0    47u\n`;
    } else if (topo2 === 'CB') {
      cir += `Cb_2 B2   0    47u\n`;
    }
    cir += `Q2   C2   B2   E2   2N2222\n\n`;

    last_out_node = topo2 === 'CC' ? 'E2' : 'C2';
  }

  const finalRl = numStages === 2 ? parseFloat(getInputs(1).rl.value) : parseFloat(getInputs(0).rl.value);

  cir += "* ---- Salida y Carga ---------------------------------------\n";
  cir += `C2_OUT ${last_out_node}  OUT  10u\n`;
  cir += `Rl   OUT  0   ${finalRl}k\n\n`;

  cir += "* =============================================================\n";
  cir += "* Modelo 2N2222\n";
  cir += "* =============================================================\n";
  cir += ".model 2N2222 NPN(Is=1.8108e-14 Bf=200 Br=6 Rb=10 Rc=1 Re=0 Cje=26.08p Vje=0.6748 Mje=0.3557 Cjc=11.01p Vjc=0.75 Mjc=0.3416 Tf=0.4117n Tr=42n VAf=74.03 IKf=0.2847 ISE=5.0e-14 NE=1.998 Xtb=1.5 Eg=1.11 Xti=3 FC=0.5)\n\n";

  cir += "* =============================================================\n";
  cir += "* ANALISIS\n";
  cir += "* =============================================================\n";
  cir += ".op\n";
  cir += ".tran 10n 1m\n";
  cir += "* .ac dec 100 10 100Meg\n";

  return cir;
}

function downloadSpiceFile() {
  const content = generateSpiceNetlist();
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'simulador_bjt.cir';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
