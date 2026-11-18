/**
 * Web Audio API Sound Effects & Haptic Feedback Engine for Ubongo! Online
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  vibrate(pattern) {
    if (this.muted) return;
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (_) {}
    }
  }

  playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.15, slideFreq = null) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, now + duration);
    }

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  pickup() {
    this.playTone(320, 'triangle', 0.06, 0.12, 460);
    this.vibrate(10);
  }

  rotate() {
    this.playTone(520, 'sine', 0.05, 0.1, 640);
    this.vibrate(8);
  }

  flip() {
    this.playTone(440, 'triangle', 0.07, 0.12, 340);
    this.vibrate(12);
  }

  place() {
    this.playTone(260, 'triangle', 0.09, 0.18, 390);
    this.vibrate(18);
  }

  invalid() {
    this.playTone(170, 'sawtooth', 0.14, 0.12, 120);
    this.vibrate([25, 30, 25]);
  }

  tick(urgent = false) {
    this.playTone(urgent ? 880 : 620, 'sine', 0.035, urgent ? 0.14 : 0.07);
  }

  ubongoFanfare() {
    if (this.muted) return;
    this.init();
    this.vibrate([40, 50, 80, 50, 140]);
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((n, idx) => {
      setTimeout(() => {
        this.playTone(n, 'triangle', idx === 3 ? 0.35 : 0.14, 0.22);
      }, idx * 95);
    });
  }

  timeUp() {
    if (this.muted) return;
    this.init();
    this.vibrate([80, 60, 120]);
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((n, idx) => {
      setTimeout(() => {
        this.playTone(n, 'sawtooth', 0.18, 0.14);
      }, idx * 110);
    });
  }
}

export const sound = new SoundManager();
