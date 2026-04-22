export const playJumpSound = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
};

export const playFallSound = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Whistling effect with sine wave
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 2.0);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 2.0);
};

export const playRecordSound = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playNote = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0.1, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration);
  };

  // Cheerful arpeggio chime
  playNote(523.25, 0, 0.4);   // C5
  playNote(659.25, 0.1, 0.4); // E5
  playNote(783.99, 0.2, 0.4); // G5
  playNote(1046.50, 0.3, 0.6); // C6
};

// --- Hell Mode Sounds (War/Chaos) ---

export const playShootSound = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // White noise burst for gunshot
  const bufferSize = ctx.sampleRate * 0.1; // 100ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1; 
  }
  
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;
  
  // Filter to make it sound punchy
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000 + Math.random() * 2000, ctx.currentTime); // Varies for chaos
  filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4 + Math.random() * 0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  
  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noiseSource.start();
};

export const playExplosionSound = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Heavy low-end rumble
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  
  // White noise crash
  const bufferSize = ctx.sampleRate * 0.5; // 500ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1; 
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, ctx.currentTime); // Loud!
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  
  osc.connect(gain);
  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  noiseSource.start();
  
  osc.stop(ctx.currentTime + 0.5);
};

// --- Theme Music Synthesizer ---

export let currentThemeCtx: AudioContext | null = null;
export let currentThemeSource: AudioBufferSourceNode | null = null;

export const stopThemeMusic = () => {
  if (currentThemeSource) {
    currentThemeSource.stop();
    currentThemeSource.disconnect();
    currentThemeSource = null;
  }
};

export const playThemeMusic = (mode: 'easy' | 'hard' | 'hell') => {
  stopThemeMusic();
  if (!currentThemeCtx) {
    currentThemeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  const ctx = currentThemeCtx;
  if (ctx!.state === 'suspended') ctx!.resume();

  const bpm = mode === 'easy' ? 90 : mode === 'hard' ? 140 : 190;
  const beatLen = 60 / bpm;
  const duration = beatLen * 8; // 8 beats loop (2 bars)
  const bufferSize = ctx!.sampleRate * duration;
  const buffer = ctx!.createBuffer(1, bufferSize, ctx!.sampleRate);
  const data = buffer.getChannelData(0);

  // Arps and minor/dissonant scales
  const notesEasy = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 196.00]; // Happy C Major
  const notesHard = [110.00, 110.00, 130.81, 110.00, 146.83, 110.00, 164.81, 130.81]; // Tense A minor
  const notesHell = [73.42, 73.42, 77.78, 77.78, 82.41, 87.31, 77.78, 73.42];       // Dissonant march

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx!.sampleRate;
    const beat = t / beatLen;
    const beatQuarter = beat % 1;
    const beatEighth = (beat * 2) % 1;
    const beat16 = (beat * 4) % 1;
    const step16 = Math.floor(beat * 4);

    let mix = 0;

    if (mode === 'easy') {
      // 1. Soft Kick (4-on-the-floor)
      const kickEnv = Math.exp(-beatQuarter * 10);
      mix += Math.sin(2 * Math.PI * 45 * t - 5 * kickEnv) * kickEnv * 0.4;
      
      // 2. Off-beat Hat
      if (Math.floor(beat * 2) % 2 === 1) {
        mix += (Math.random() - 0.5) * Math.exp(-beatEighth * 15) * 0.05;
      }
      
      // 3. Cheerful Triangle Arpeggio
      const freq = notesEasy[Math.floor(beat * 2) % notesEasy.length] * 2;
      const arpEnv = Math.exp(-beatEighth * 4);
      const saw = Math.asin(Math.sin(2 * Math.PI * freq * t)) * 0.6; // Triangle approx
      mix += saw * arpEnv * 0.15;

    } else if (mode === 'hard') {
      // 1. Punchy Tech Kick
      const kickEnv = Math.exp(-beatQuarter * 15);
      mix += Math.sin(2 * Math.PI * 55 * t - 15 * kickEnv) * kickEnv * 0.5;
      
      // 2. 16th note rolling square bass
      const freq = notesHard[step16 % notesHard.length];
      const bassEnv = Math.exp(-beat16 * 8);
      const wave = (t * freq % 1 > 0.5 ? 1 : -1) * 0.6; 
      mix += wave * bassEnv * 0.12;

      // 3. Fast hats
      if (step16 % 4 > 1) {
         mix += (Math.random() - 0.5) * Math.exp(-beat16 * 20) * 0.08;
      }
      
    } else if (mode === 'hell') {
      // 1. Distorted Gabber Kick (Overdriven clip)
      const kickEnv = Math.exp(-beatQuarter * 12);
      let kickWave = Math.sin(2 * Math.PI * 60 * t - 25 * kickEnv) * kickEnv * 2.5; 
      kickWave = Math.max(-0.7, Math.min(0.7, kickWave)); // Hard clip ceiling
      mix += kickWave * 0.35;

      // 2. War Alarm (high slow siren)
      const alarmFreq = 800 + Math.sin(2 * Math.PI * 0.5 * t) * 200;
      const alarmWave = Math.sin(2 * Math.PI * alarmFreq * t) * 0.08;
      mix += alarmWave;

      // 3. Machine Gun Snares (second half of the beat)
      if (step16 % 8 > 3) {
         mix += (Math.random() - 0.5) * Math.exp(-beat16 * 40) * 0.2;
      }

      // 4. Sub shaking bass
      const freq = notesHell[step16 % notesHell.length];
      const square = (t * freq % 1 > 0.5 ? 0.3 : -0.3);
      mix += square * 0.15;
    }

    // Safety master limiter
    mix = Math.max(-1, Math.min(1, mix));
    data[i] = mix * 0.25; // General master volume
  }

  const source = ctx!.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(ctx!.destination);
  source.start();
  currentThemeSource = source;
};
