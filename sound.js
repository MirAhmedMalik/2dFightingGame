// Advanced Audio Engine for Tekken-style Impacts and Announcer
let audioCtx = null;
let distCurve = null;

export function initAudio() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
        distCurve = makeDistortionCurve(100); // 100x overdrive for hits
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function now() {
    return audioCtx ? audioCtx.currentTime : 0;
}

// Intense flesh-impact distortion curve
function makeDistortionCurve(amount) {
    let k = amount;
    let n_samples = 44100;
    let curve = new Float32Array(n_samples);
    let deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        let x = i * 2 / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

// Deep bass thud (simulates bone/flesh hit)
function boneCrunch(duration, heavy = false) {
    if (!audioCtx) return;
    const t = now();
    
    // Sub-bass oscillator
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(heavy ? 150 : 200, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + duration);

    // Distortion
    const distortion = audioCtx.createWaveShaper();
    distortion.curve = distCurve;
    distortion.oversample = '4x';

    // Envelope
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(heavy ? 0.8 : 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(t);
    osc.stop(t + duration);
}

// Sharp transient noise (simulates leather/skin slap)
function noiseSlap(duration, heavy = false) {
    if (!audioCtx) return;
    const t = now();
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const src = audioCtx.createBufferSource();
    src.buffer = buffer;

    // High pass filter to remove mud from the slap
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(heavy ? 0.6 : 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    src.start(t);
    src.stop(t + duration);
}

// Swoosh sound for misses
export function playSwoosh(heavy = false) {
    if (!audioCtx) return;
    const t = now();
    const duration = heavy ? 0.2 : 0.15;
    
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(heavy ? 300 : 400, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + duration);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(heavy ? 0.1 : 0.05, t + duration * 0.3); // Fade in
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration); // Fade out

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + duration);
}

function tone(freq, duration, type = 'square', gainLevel = 0.2) {
    if (!audioCtx) return;
    const t = now();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gainLevel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration);
}

export function playHit(heavy = false) {
    // Powerful overlaid synth mimicking Tekken bone hits
    boneCrunch(heavy ? 0.3 : 0.15, heavy);
    noiseSlap(heavy ? 0.2 : 0.1, heavy);
}

export function playBlock() {
    tone(600, 0.1, 'square', 0.1);
    tone(400, 0.1, 'triangle', 0.2);
    noiseSlap(0.05, false);
}

export function playSpecial() {
    // Sci-fi powerup sound
    if (!audioCtx) return;
    const t = now();
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
}

export function playSuper() {
    if (!audioCtx) return;
    const t = now();
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.6);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
}

export function playUiSelect() {
    tone(800, 0.05, 'sine', 0.1);
}

// Tekken-style Announcer using Web Speech API
export function playAnnouncer(text) {
    if (!window.speechSynthesis) return;
    const msg = new SpeechSynthesisUtterance();
    msg.text = text;
    msg.pitch = 0.3; // Very low pitch for booming voice
    msg.rate = 0.9;  // Slightly slow
    msg.volume = 1.0;
    // Attempt to pick an en-US male voice if available
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'));
    if (maleVoice) msg.voice = maleVoice;
    
    window.speechSynthesis.speak(msg);
}
