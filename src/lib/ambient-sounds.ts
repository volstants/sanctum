// Procedural ambient sound generation via Web Audio API
// No external URLs — all sounds generated in-browser

export type AmbientPreset =
  | 'rain' | 'forest' | 'tavern' | 'dungeon' | 'combat' | 'fire' | 'ocean' | 'wind';

export const AMBIENT_PRESETS: { id: AmbientPreset; label: string; emoji: string }[] = [
  { id: 'rain',    label: 'Chuva',    emoji: '🌧️' },
  { id: 'forest',  label: 'Floresta', emoji: '🌲' },
  { id: 'ocean',   label: 'Oceano',   emoji: '🌊' },
  { id: 'wind',    label: 'Vento',    emoji: '💨' },
  { id: 'tavern',  label: 'Taverna',  emoji: '🍺' },
  { id: 'dungeon', label: 'Masmorra', emoji: '🏚️' },
  { id: 'combat',  label: 'Combate',  emoji: '⚔️' },
  { id: 'fire',    label: 'Fogueira', emoji: '🔥' },
];

// ── Noise buffer helpers ──────────────────────────────────────────────────────

function createWhiteNoise(ctx: AudioContext, seconds = 4): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sampleRate * seconds, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function createBrownNoise(ctx: AudioContext, seconds = 4): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sampleRate * seconds, sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5; // normalize
  }
  return buf;
}

function createPinkNoise(ctx: AudioContext, seconds = 4): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sampleRate * seconds, sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.11;
  }
  return buf;
}

// ── Looping noise source ──────────────────────────────────────────────────────

function loopingSource(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

// ── Preset builders ───────────────────────────────────────────────────────────

export interface AmbientNodes {
  stop: () => void;
}

export function buildAmbientSound(
  ctx: AudioContext,
  preset: AmbientPreset,
  volume: number,
): AmbientNodes {
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  const nodes: AudioNode[] = [master];
  const sources: AudioBufferSourceNode[] = [];

  function addSrc(buf: AudioBuffer, gain = 1): AudioBufferSourceNode {
    const src = loopingSource(ctx, buf);
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(master);
    nodes.push(g);
    sources.push(src);
    src.start();
    return src;
  }

  function bpFilter(freq: number, q: number): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    nodes.push(f);
    return f;
  }

  function lpFilter(freq: number): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    nodes.push(f);
    return f;
  }

  function hpFilter(freq: number): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = freq;
    nodes.push(f);
    return f;
  }

  function osc(freq: number, type: OscillatorType, gain: number): OscillatorNode {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g);
    g.connect(master);
    nodes.push(g, o);
    o.start();
    return o;
  }

  function lfo(freq: number, depth: number, target: AudioParam) {
    const l = ctx.createOscillator();
    l.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = depth;
    l.connect(g);
    g.connect(target);
    nodes.push(l, g);
    l.start();
  }

  switch (preset) {
    case 'rain': {
      // Heavy white noise + HP + LP to sound like rainfall
      const white = createWhiteNoise(ctx, 3);
      const src = loopingSource(ctx, white);
      const hp = hpFilter(200);
      const lp = lpFilter(6000);
      const g = ctx.createGain();
      g.gain.value = 0.7;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
      nodes.push(hp, lp, g);
      sources.push(src);
      src.start();

      // Occasional heavier burst (LFO amplitude modulation)
      lfo(0.3, 0.1, g.gain);
      break;
    }

    case 'forest': {
      // Pink noise (leafy, organic) + soft LP
      const pink = createPinkNoise(ctx, 5);
      const src = loopingSource(ctx, pink);
      const lp = lpFilter(3000);
      const hp = hpFilter(150);
      const g = ctx.createGain();
      g.gain.value = 0.4;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
      nodes.push(hp, lp, g);
      sources.push(src);
      src.start();

      // Wind sway (very slow LFO)
      lfo(0.08, 0.08, g.gain);

      // Bird-like high chirp (very subtle)
      osc(3200, 'sine', 0.002);
      break;
    }

    case 'ocean': {
      // Brown noise + slow LFO = wave rhythm
      const brown = createBrownNoise(ctx, 6);
      const src = loopingSource(ctx, brown);
      const lp = lpFilter(800);
      const g = ctx.createGain();
      g.gain.value = 0.6;
      src.connect(lp); lp.connect(g); g.connect(master);
      nodes.push(lp, g);
      sources.push(src);
      src.start();

      // Wave rhythm (slow amplitude LFO ~0.12Hz = ~8s wave)
      const lfoNode = ctx.createOscillator();
      lfoNode.frequency.value = 0.12;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.3;
      lfoNode.connect(lfoGain);
      lfoGain.connect(g.gain);
      lfoNode.start();
      nodes.push(lfoNode, lfoGain);
      break;
    }

    case 'wind': {
      // Pink noise + HP + BP resonance + slow LFO
      const pink = createPinkNoise(ctx, 4);
      const src = loopingSource(ctx, pink);
      const hp = hpFilter(300);
      const bp = bpFilter(800, 0.5);
      const g = ctx.createGain();
      g.gain.value = 0.5;
      src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(master);
      nodes.push(hp, bp, g);
      sources.push(src);
      src.start();

      lfo(0.15, 0.2, g.gain);
      lfo(0.07, 100, bp.frequency);
      break;
    }

    case 'tavern': {
      // Brown noise as "crowd murmur" + bandpass for voice frequencies
      const brown = createBrownNoise(ctx, 4);
      const src = loopingSource(ctx, brown);
      const bp = bpFilter(400, 1.5);
      const g = ctx.createGain();
      g.gain.value = 0.3;
      src.connect(bp); bp.connect(g); g.connect(master);
      nodes.push(bp, g);
      sources.push(src);
      src.start();

      // Subtle "music" undertone (low oscillators)
      osc(110, 'triangle', 0.015);
      osc(165, 'triangle', 0.010);
      osc(220, 'sine', 0.008);

      // Random crowd swell
      lfo(0.2, 0.08, g.gain);
      break;
    }

    case 'dungeon': {
      // Very low brown noise = cave rumble
      const brown = createBrownNoise(ctx, 8);
      const src = loopingSource(ctx, brown);
      const lp = lpFilter(150);
      const g = ctx.createGain();
      g.gain.value = 0.5;
      src.connect(lp); lp.connect(g); g.connect(master);
      nodes.push(lp, g);
      sources.push(src);
      src.start();

      // Low sub-bass drone
      osc(40, 'sine', 0.04);
      osc(55, 'sine', 0.02);

      // Drip-like ping (very subtle, slow)
      lfo(0.05, 0.03, g.gain);
      break;
    }

    case 'combat': {
      // Brown noise base + heavy LP + LFO = tension rumble
      const brown = createBrownNoise(ctx, 3);
      const src = loopingSource(ctx, brown);
      const lp = lpFilter(300);
      const g = ctx.createGain();
      g.gain.value = 0.7;
      src.connect(lp); lp.connect(g); g.connect(master);
      nodes.push(lp, g);
      sources.push(src);
      src.start();

      // Low tension drone
      osc(55, 'sawtooth', 0.03);
      osc(73, 'sawtooth', 0.02);

      // Fast rhythm pulse
      lfo(2.5, 0.15, g.gain);
      break;
    }

    case 'fire': {
      // White noise + bandpass for crackle + slow LFO = fire
      const white = createWhiteNoise(ctx, 2);
      const src = loopingSource(ctx, white);
      const bp = bpFilter(600, 0.8);
      const lp = lpFilter(3000);
      const g = ctx.createGain();
      g.gain.value = 0.4;
      src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(master);
      nodes.push(bp, lp, g);
      sources.push(src);
      src.start();

      // Flicker
      lfo(8, 0.05, g.gain);
      lfo(0.3, 0.1, g.gain);
      break;
    }
  }

  return {
    stop: () => {
      sources.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
      nodes.forEach((n) => { try { n.disconnect(); } catch { /* already disconnected */ } });
    },
  };
}
