
// Simple Web Audio API service to synthesize sounds without external assets

let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const resumeAudio = () => {
  const ctx = getCtx();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
};

export const playWhistle = () => {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Create two oscillators with slightly different frequencies to create a "beating" texture (trill)
    // This mimics the "pea" inside a referee whistle.
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Frequency sweep for realism (slight drop in pitch)
    osc1.frequency.setValueAtTime(2800, t);
    osc1.frequency.exponentialRampToValueAtTime(1800, t + 0.4);

    osc2.frequency.setValueAtTime(2900, t); // Slight offset creates the trill/beat
    osc2.frequency.exponentialRampToValueAtTime(1850, t + 0.4);

    // Gain envelope: Sharp attack, short sustain, sharp release
    // LOWERED VOLUME: 0.25 -> 0.1, 0.15 -> 0.06
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.1, t + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.06, t + 0.2);
    gainNode.gain.linearRampToValueAtTime(0, t + 0.4);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.4);
    osc2.stop(t + 0.4);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export const playGoalSound = () => {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // 1. Crowd Roar Simulation (Filtered Noise)
    const bufferSize = ctx.sampleRate * 2.5; // 2.5 seconds duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Lowpass Filter: Starts low and opens up to simulate the swell of the crowd
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.linearRampToValueAtTime(1200, t + 1.0); 

    const noiseGain = ctx.createGain();
    // LOWERED VOLUME: 0.4 -> 0.15
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.15, t + 0.2); // Fast fade in
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 2.5); // Long tail fade out

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);

    // 2. Subtle Fanfare (Major Chord Arpeggio)
    // C Major: C, E, G, C
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        
        osc.type = 'triangle'; // Triangle wave is softer/flutier than sawtooth/square
        osc.frequency.value = freq;
        
        osc.connect(g);
        g.connect(ctx.destination);
        
        // Staggered entry
        // LOWERED VOLUME: 0.08 -> 0.03
        const start = t + (i * 0.05); 
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.03, start + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, start + 1.5);
        
        osc.start(start);
        osc.stop(start + 1.5);
    });

  } catch (e) {
    console.error("Audio play failed", e);
  }
};
