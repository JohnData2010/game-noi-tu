// Web Audio API Synthesized Sound Effects (No external files needed)
class SoundManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.unlockMobileAudio();
    this.handleVisibility();
  }

  unlockMobileAudio() {
    const unlock = () => {
      try {
        this.init();
        if (this.ctx) {
          const buffer = this.ctx.createBuffer(1, 1, 22050);
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.ctx.destination);
          source.start(0);
        }
      } catch (e) {}
    };

    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('touchend', unlock, { passive: true });
    document.addEventListener('click', unlock, { passive: true });
  }

  handleVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx) {
        if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
          this.ctx.resume().catch(() => {});
        }
      }
    });
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playPop() {
    if (!this.enabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  }

  playMessageReceived() {
    if (!this.enabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playTick() {
    if (!this.enabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {}
  }

  playBuzzer() {
    if (!this.enabled) return;
    try {
      this.init();
      // Low saw wave buzzer for foul / elimination
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.setValueAtTime(110, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  playStart() {
    if (!this.enabled) return;
    try {
      this.init();
      const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = this.ctx.currentTime + index * 0.08;
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      });
    } catch (e) {}
  }

  playVictory() {
    if (!this.enabled) return;
    try {
      this.init();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major fanfare
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const startTime = this.ctx.currentTime + index * 0.12;
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch (e) {}
  }
}

window.soundManager = new SoundManager();
