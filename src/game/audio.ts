export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private initialized = false;
  private muted = false;

  public init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.42;
      master.connect(ctx.destination);
      this.masterGain = master;

      // Engine turbine oscillator + sub harmonic
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      filter.Q.value = 3.2;

      const engGain = ctx.createGain();
      engGain.gain.value = 0.0;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 55;

      const sub = ctx.createOscillator();
      sub.type = 'triangle';
      sub.frequency.value = 27.5;

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(engGain);
      engGain.connect(master);

      osc.start();
      sub.start();

      // Road & Nitro wind noise buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.value = 420;
      nFilter.Q.value = 1.4;

      const nGain = ctx.createGain();
      nGain.gain.value = 0.0;

      noiseSource.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(master);
      noiseSource.start();

      this.engineOsc = osc;
      this.subOsc = sub;
      this.engineFilter = filter;
      this.engineGain = engGain;
      this.noiseFilter = nFilter;
      this.noiseGain = nGain;
      this.initialized = true;
    } catch {
      // Ignore Web Audio errors if blocked by browser policy
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.42, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateEngine(speed: number, isBoosting: boolean, active: boolean): void {
    if (!this.initialized || !this.ctx || !this.engineOsc || !this.subOsc || !this.engineFilter || !this.engineGain || !this.noiseGain || !this.noiseFilter) {
      return;
    }

    const now = this.ctx.currentTime;
    if (!active || this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.noiseGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const norm = Math.max(0, Math.min(1.5, (speed - 25) / 85));
    const baseFreq = 48 + norm * 78 + (isBoosting ? 26 : 0);

    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(
      220 + norm * 560 + (isBoosting ? 480 : 0),
      now,
      0.06
    );
    this.engineGain.gain.setTargetAtTime(isBoosting ? 0.2 : 0.13, now, 0.08);

    this.noiseFilter.frequency.setTargetAtTime(isBoosting ? 1250 : 380 + norm * 320, now, 0.08);
    this.noiseGain.gain.setTargetAtTime(isBoosting ? 0.14 : 0.025 + norm * 0.025, now, 0.08);
  }

  public playNearMiss(combo: number): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const rootFreq = 440 * Math.pow(1.06, Math.min(combo, 12));
    osc.frequency.setValueAtTime(rootFreq, now);
    osc.frequency.exponentialRampToValueAtTime(rootFreq * 1.48, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playSectorUp(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [293.66, 440, 587.33];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }

  public playScrape(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.09);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playCrash(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Sub impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.42);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.48);

    // Metallic crunch burst
    const bufferLen = Math.floor(this.ctx.sampleRate * 0.35);
    const buffer = this.ctx.createBuffer(1, bufferLen, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferLen * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 950;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.45, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
  }

  public dispose(): void {
    try {
      this.engineOsc?.stop();
      this.subOsc?.stop();
      if (this.ctx && this.ctx.state !== 'closed') {
        void this.ctx.close();
      }
    } catch {
      // Ignore cleanup errors
    }
    this.initialized = false;
  }
}
