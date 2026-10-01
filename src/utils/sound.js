// Audio and Haptic feedback utilities for tablet operations

export function playBeep(type = 'success') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Pleasant high-pitched double beep (like supermarket/industrial scanner)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // High A6
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'alert') {
      // Warning buzzer
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (err) {
    // Audio context not allowed before user gesture
  }

  // Trigger tablet vibration if supported
  if (navigator.vibrate) {
    try {
      if (type === 'success') {
        navigator.vibrate([70]);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (_) {}
  }
}
