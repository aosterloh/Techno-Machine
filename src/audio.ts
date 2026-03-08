// src/audio.ts
export type FXSettings = { delay: number, reverb: number, time: number };
export type SubBassSettings = { decay: number, sustain: number, cutoff: number, resonance: number, envAmount: number };
export type SynthSettings = { 
  decay: number, 
  cutoff: number, 
  resonance: number, 
  filterType: 'none' | 'lowpass' | 'highpass',
  waveform: 'sawtooth' | 'square' | 'sine' | 'triangle',
  envAmount: number
};

export class AudioEngine {
  ctx: AudioContext;
  samples: Map<string, AudioBuffer>;
  reverbBuffer: AudioBuffer | null = null;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.samples = new Map();
    this.initReverb();
  }

  private async initReverb() {
    this.reverbBuffer = this.createReverbBuffer(2.0, 3.0);
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

  private applyFX(sourceNode: AudioNode, fx: FXSettings) {
    // Apply Delay
    if (fx.delay > 0) {
      const delayNode = this.ctx.createDelay(10.0);
      delayNode.delayTime.value = fx.time;
      
      const feedbackGain = this.ctx.createGain();
      // Level 1-4 -> feedback 0.2-0.7
      const feedback = 0.1 + (fx.delay * 0.15);
      feedbackGain.gain.value = Math.min(feedback, 0.8); 
      
      const wetGain = this.ctx.createGain();
      // Level 1-4 -> wet 0.1-0.5
      wetGain.gain.value = fx.delay * 0.12;
      
      sourceNode.connect(delayNode);
      delayNode.connect(feedbackGain);
      feedbackGain.connect(delayNode);
      delayNode.connect(wetGain);
      wetGain.connect(this.ctx.destination);
    }

    // Apply Reverb
    if (fx.reverb > 0 && this.reverbBuffer) {
      const convolver = this.ctx.createConvolver();
      convolver.buffer = this.reverbBuffer;
      
      const reverbGain = this.ctx.createGain();
      // Level 1-4 -> wet 0.1-0.6
      reverbGain.gain.value = fx.reverb * 0.15;
      
      sourceNode.connect(convolver);
      convolver.connect(reverbGain);
      reverbGain.connect(this.ctx.destination);
    }
  }

  async loadSample(name: string, url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.samples.set(name, audioBuffer);
      console.log(`Loaded sample: ${name}`);
    } catch (e) {
      console.warn(`Failed to load sample ${name} from ${url}:`, e);
    }
  }

  playSample(name: string, time: number, volume: number = 1.0, fx: FXSettings) {
    if (this.samples.has(name)) {
      const buffer = this.samples.get(name)!;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = volume;
      
      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      this.applyFX(gainNode, fx);
      
      source.start(time);
    } else {
      this.playSynthesized(name, time, volume, fx);
    }
  }

  playMoogBass(time: number, freq: number, volume: number = 1.0, settings: SynthSettings, fx: FXSettings) {
    this.playMelodicSynth(time, freq, volume, settings, fx);
  }

  playMelodicSynth(time: number, freq: number, volume: number = 1.0, settings: SynthSettings, fx: FXSettings) {
    const ctx = this.ctx;
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    
    this.applyFX(masterGain, fx);

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

    const ampGain = ctx.createGain();
    ampGain.gain.setValueAtTime(0, time);
    ampGain.gain.linearRampToValueAtTime(1, time + 0.005); 
    ampGain.gain.exponentialRampToValueAtTime(0.001, time + settings.decay);

    lastNode.connect(ampGain);
    ampGain.connect(masterGain);

    const stopTime = time + settings.decay + 0.1;
    osc1.start(time);
    osc2.start(time);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
  }

  playSubBass(time: number, freq: number, volume: number = 1.0, settings: SubBassSettings, fx: FXSettings) {
    const ctx = this.ctx;
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    
    this.applyFX(masterGain, fx);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(settings.resonance, time);
    
    const startFreq = settings.cutoff + (settings.envAmount * 1000);
    filter.frequency.setValueAtTime(Math.max(20, startFreq), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, settings.cutoff), time + settings.decay);

    const ampGain = ctx.createGain();
    ampGain.gain.setValueAtTime(0, time);
    ampGain.gain.linearRampToValueAtTime(1, time + 0.005); 
    ampGain.gain.exponentialRampToValueAtTime(Math.max(0.001, settings.sustain), time + settings.decay);
    
    const releaseTime = 0.1;
    ampGain.gain.exponentialRampToValueAtTime(0.001, time + settings.decay + releaseTime);

    osc.connect(filter);
    filter.connect(ampGain);
    ampGain.connect(masterGain);

    osc.start(time);
    osc.stop(time + settings.decay + releaseTime);
  }

  playSynthesized(name: string, time: number, volume: number = 1.0, fx: FXSettings) {
    const ctx = this.ctx;
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    
    this.applyFX(masterGain, fx);

    if (name.includes('Kick')) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.start(time);
      osc.stop(time + 0.5);
    } else if (name.includes('HH') || name.includes('Ride')) {
      const bufferSize = ctx.sampleRate * 0.1; 
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(name.includes('Ride') ? 0.5 : 0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noise.start(time);
    } else if (name.includes('Snare') || name.includes('Clap')) {
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noise.start(time);
    } else if (name.includes('Bass')) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(name === 'Bass1' ? 55 : 65, time);
      osc.connect(gain);
      gain.connect(masterGain);
      gain.gain.setValueAtTime(0.5, time);
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
      gain.connect(masterGain);
      gain.gain.setValueAtTime(0.3, time);
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
        gain.gain.linearRampToValueAtTime(0.4, time + 0.1);
        gain.gain.setValueAtTime(0.4, time + 1.8);
        gain.gain.linearRampToValueAtTime(0, time + 2.0);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 2.0);
      } else if (type === 'Riser') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.exponentialRampToValueAtTime(2000, time + 4.0);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 3.5);
        gain.gain.linearRampToValueAtTime(0, time + 4.0);
        osc.connect(gain);
        gain.connect(masterGain);
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
        gain.gain.linearRampToValueAtTime(0.4, time + 0.5);
        gain.gain.linearRampToValueAtTime(0, time + 2.0);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(time);
      } else if (type === 'Laser') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(3000, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.2);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.2);
      } else if (type === 'Impact') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(80, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 1.0);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 1.0);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 1.0);
      } else if (type === 'Zap') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, time);
        osc.frequency.exponentialRampToValueAtTime(10, time + 0.1);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
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
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 1.0);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
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
        gain.gain.linearRampToValueAtTime(0.5, time + 0.45);
        gain.gain.linearRampToValueAtTime(0, time + 0.5);
        noise.connect(gain);
        gain.connect(masterGain);
        noise.start(time);
      }
    }
  }
}
