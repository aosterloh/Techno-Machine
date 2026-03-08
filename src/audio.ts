// src/audio.ts
export type FXSettings = { delay: number, reverb: number, time: number };
export type SubBassSettings = { 
  decay: number, 
  sustain: number, 
  cutoff: number, 
  resonance: number, 
  envAmount: number,
  drive: number,
  pitchEnv: number
};
export type SynthSettings = { 
  decay: number, 
  cutoff: number, 
  resonance: number, 
  filterType: 'none' | 'lowpass' | 'highpass',
  waveform: 'sawtooth' | 'square' | 'sine' | 'triangle',
  envAmount: number
};

class TrackBus {
  ctx: AudioContext;
  input: GainNode;
  output: GainNode;
  delayNode: DelayNode;
  delayFeedback: GainNode;
  delayWet: GainNode;
  reverbSend: GainNode;

  constructor(ctx: AudioContext, globalReverb: AudioNode) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    
    // Delay setup (per track)
    this.delayNode = ctx.createDelay(2.0);
    this.delayFeedback = ctx.createGain();
    this.delayWet = ctx.createGain();
    
    this.input.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayWet);
    this.delayWet.connect(this.output);
    
    // Reverb Send (to global reverb)
    this.reverbSend = ctx.createGain();
    this.input.connect(this.reverbSend);
    this.reverbSend.connect(globalReverb);
    
    // Direct path
    this.input.connect(this.output);
    this.output.connect(ctx.destination);
  }

  updateFX(fx: FXSettings) {
    // Use setTargetAtTime for smooth transitions without clicks
    const now = this.ctx.currentTime;
    this.delayNode.delayTime.setTargetAtTime(fx.time, now, 0.05);
    const feedback = fx.delay > 0 ? 0.1 + (fx.delay * 0.15) : 0;
    this.delayFeedback.gain.setTargetAtTime(Math.min(feedback, 0.8), now, 0.05);
    this.delayWet.gain.setTargetAtTime(fx.delay * 0.12, now, 0.05);
    this.reverbSend.gain.setTargetAtTime(fx.reverb * 0.2, now, 0.05);
  }
}

export class AudioEngine {
  ctx: AudioContext;
  samples: Map<string, AudioBuffer>;
  reverbBuffer: AudioBuffer | null = null;
  convolver: ConvolverNode;
  reverbOutput: GainNode;
  trackBuses: TrackBus[] = [];

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.samples = new Map();
    
    // Global Reverb Bus
    this.convolver = this.ctx.createConvolver();
    this.reverbOutput = this.ctx.createGain();
    this.reverbOutput.gain.value = 0.8;
    this.convolver.connect(this.reverbOutput);
    this.reverbOutput.connect(this.ctx.destination);
    
    this.initReverb();
    
    // Pre-create 13 track buses (9 samples + 4 synths)
    for (let i = 0; i < 13; i++) {
      this.trackBuses.push(new TrackBus(this.ctx, this.convolver));
    }
  }

  private async initReverb() {
    this.reverbBuffer = this.createReverbBuffer(2.0, 3.0);
    this.convolver.buffer = this.reverbBuffer;
  }

  private createReverbBuffer(duration: number, decay: number) {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  async loadSample(name: string, url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.samples.set(name, audioBuffer);
    } catch (e) {
      console.warn(`Failed to load sample ${name} from ${url}:`, e);
    }
  }

  playSample(name: string, time: number, volume: number = 1.0, fx: FXSettings, trackIndex: number = 0) {
    const bus = this.trackBuses[trackIndex] || this.trackBuses[0];
    bus.updateFX(fx);

    if (this.samples.has(name)) {
      const buffer = this.samples.get(name)!;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(volume, time);
      
      source.connect(gainNode);
      gainNode.connect(bus.input);
      source.start(time);
    } else {
      this.playSynthesized(name, time, volume, fx, trackIndex);
    }
  }

  playMelodicSynth(time: number, freq: number, volume: number = 1.0, settings: SynthSettings, fx: FXSettings, trackIndex: number) {
    const bus = this.trackBuses[trackIndex];
    bus.updateFX(fx);

    const ctx = this.ctx;
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0, time);
    voiceGain.gain.linearRampToValueAtTime(volume, time + 0.005);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, time + settings.decay);
    voiceGain.connect(bus.input);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = settings.waveform;
    osc2.type = settings.waveform;
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.005, time); 

    let lastNode: AudioNode = osc1;
    const mixer = ctx.createGain();
    osc1.connect(mixer);
    osc2.connect(mixer);
    lastNode = mixer;

    if (settings.filterType !== 'none') {
      const filter = ctx.createBiquadFilter();
      filter.type = settings.filterType;
      filter.Q.value = settings.resonance; 
      
      const baseFreq = settings.cutoff;
      const sweepFreq = settings.filterType === 'lowpass' 
        ? Math.min(20000, baseFreq + (settings.envAmount * 5000))
        : Math.max(20, baseFreq - (settings.envAmount * 5000));

      filter.frequency.setValueAtTime(sweepFreq, time);
      filter.frequency.exponentialRampToValueAtTime(baseFreq, time + settings.decay);
      
      lastNode.connect(filter);
      lastNode = filter;
    }

    lastNode.connect(voiceGain);

    const stopTime = time + settings.decay + 0.1;
    osc1.start(time);
    osc2.start(time);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
  }

  playSubBass(time: number, freq: number, volume: number = 1.0, settings: SubBassSettings, fx: FXSettings, trackIndex: number) {
    const bus = this.trackBuses[trackIndex];
    bus.updateFX(fx);

    const ctx = this.ctx;
    
    // Techno Sub: Sine with pitch envelope and saturation
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    
    // Pitch envelope for punch
    const startFreq = freq * (1 + settings.pitchEnv);
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(settings.resonance, time);
    const filterStart = settings.cutoff + (settings.envAmount * 2000);
    filter.frequency.setValueAtTime(filterStart, time);
    filter.frequency.exponentialRampToValueAtTime(settings.cutoff, time + settings.decay);

    // Saturation/Drive
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(settings.drive * 100);

    const ampGain = ctx.createGain();
    ampGain.gain.setValueAtTime(0, time);
    ampGain.gain.linearRampToValueAtTime(volume, time + 0.005); 
    ampGain.gain.exponentialRampToValueAtTime(Math.max(0.001, settings.sustain * volume), time + settings.decay);
    
    const releaseTime = 0.2;
    ampGain.gain.exponentialRampToValueAtTime(0.001, time + settings.decay + releaseTime);

    osc.connect(filter);
    filter.connect(shaper);
    shaper.connect(ampGain);
    ampGain.connect(bus.input);

    osc.start(time);
    osc.stop(time + settings.decay + releaseTime);
  }

  private makeDistortionCurve(amount: number) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  playSynthesized(name: string, time: number, volume: number = 1.0, fx: FXSettings, trackIndex: number) {
    const bus = this.trackBuses[trackIndex];
    bus.updateFX(fx);
    const ctx = this.ctx;

    if (name.includes('Kick')) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(bus.input);
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.start(time);
      osc.stop(time + 0.5);
    } else if (name.includes('HH') || name.includes('Ride')) {
      const bufferSize = ctx.sampleRate * 0.1; 
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * (name.includes('Ride') ? 0.5 : 0.3), time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(bus.input);
      noise.start(time);
    } else if (name.includes('Snare') || name.includes('Clap')) {
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(bus.input);
      noise.start(time);
    } else if (name.includes('Bass')) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(name === 'Bass1' ? 55 : 65, time);
      osc.connect(gain);
      gain.connect(bus.input);
      gain.gain.setValueAtTime(volume * 0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      osc.start(time);
      osc.stop(time + 0.2);
    } else if (name.includes('Synth')) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const freqs = { 'Synth1': 220, 'Synth2': 277, 'Synth3': 330, 'Synth4': 440, 'Synth5': 554, 'Synth6': 659 };
      osc.frequency.setValueAtTime((freqs as any)[name] || 440, time);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, time);
      filter.frequency.exponentialRampToValueAtTime(200, time + 0.3);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(bus.input);
      gain.gain.setValueAtTime(volume * 0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
      osc.start(time);
      osc.stop(time + 0.3);
    } else if (name.startsWith('FX_')) {
      const type = name.split('_')[1];
      if (type === 'Siren') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, time);
        osc.frequency.exponentialRampToValueAtTime(880, time + 0.5);
        osc.frequency.exponentialRampToValueAtTime(440, time + 1.0);
        osc.frequency.exponentialRampToValueAtTime(880, time + 1.5);
        osc.frequency.exponentialRampToValueAtTime(440, time + 2.0);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume * 0.4, time + 0.1);
        gain.gain.setValueAtTime(volume * 0.4, time + 1.8);
        gain.gain.linearRampToValueAtTime(0, time + 2.0);
        osc.connect(gain);
        gain.connect(bus.input);
        osc.start(time);
        osc.stop(time + 2.0);
      } else if (type === 'Riser') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.exponentialRampToValueAtTime(2000, time + 4.0);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume * 0.3, time + 3.5);
        gain.gain.linearRampToValueAtTime(0, time + 4.0);
        osc.connect(gain);
        gain.connect(bus.input);
        osc.start(time);
        osc.stop(time + 4.0);
      } else if (type === 'Noise') {
        const bufferSize = ctx.sampleRate * 2.0;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(100, time);
        filter.frequency.exponentialRampToValueAtTime(10000, time + 2.0);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume * 0.4, time + 0.5);
        gain.gain.linearRampToValueAtTime(0, time + 2.0);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(bus.input);
        noise.start(time);
      } else if (type === 'Laser') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(3000, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.2);
        gain.gain.setValueAtTime(volume * 0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.connect(gain);
        gain.connect(bus.input);
        osc.start(time);
        osc.stop(time + 0.2);
      } else if (type === 'Impact') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(80, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 1.0);
        gain.gain.setValueAtTime(volume * 0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 1.0);
        osc.connect(gain);
        gain.connect(bus.input);
        osc.start(time);
        osc.stop(time + 1.0);
      } else if (type === 'Zap') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, time);
        osc.frequency.exponentialRampToValueAtTime(10, time + 0.1);
        gain.gain.setValueAtTime(volume * 0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.connect(gain);
        gain.connect(bus.input);
        osc.start(time);
        osc.stop(time + 0.1);
      } else if (type === 'Sweep') {
        const bufferSize = ctx.sampleRate * 1.0;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(10000, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 1.0);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume * 0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 1.0);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(bus.input);
        noise.start(time);
      } else if (type === 'Reverse') {
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume * 0.5, time + 0.45);
        gain.gain.linearRampToValueAtTime(0, time + 0.5);
        noise.connect(gain);
        gain.connect(bus.input);
        noise.start(time);
      }
    }
  }
}
