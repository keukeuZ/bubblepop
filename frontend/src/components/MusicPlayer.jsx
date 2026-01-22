import { useState, useEffect, useRef, useCallback } from 'react';

// Pentatonic scale notes for soothing melodies (in Hz)
const PENTATONIC_SCALE = {
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
  C6: 1046.50,
};

const BASS_NOTES = {
  C2: 65.41, D2: 73.42, E2: 82.41, G2: 98.00, A2: 110.00,
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
};

// Chord progressions (indices into scale)
const PROGRESSIONS = [
  [0, 2, 4, 2], // I - III - V - III
  [0, 4, 3, 2], // I - V - IV - III
  [0, 2, 3, 4], // I - III - IV - V
];

class ChiptuneGenerator {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.scheduledNotes = [];
    this.currentBeat = 0;
    this.tempo = 75; // BPM - slower for chill vibes
    this.progression = PROGRESSIONS[0];
    this.progressionIndex = 0;
  }

  init() {
    if (this.audioContext) return;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.audioContext.destination);

    // Compressor for smoother sound
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.connect(this.masterGain);
  }

  setVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  }

  // Create 8-bit square wave oscillator
  createSquareOsc(freq, startTime, duration, volume = 0.15) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.value = freq;

    // Envelope for softer attack/release
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.setValueAtTime(volume, startTime + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(startTime);
    osc.stop(startTime + duration);

    return osc;
  }

  // Create triangle wave for bass
  createTriangleOsc(freq, startTime, duration, volume = 0.2) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.setValueAtTime(volume * 0.7, startTime + duration * 0.5);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(startTime);
    osc.stop(startTime + duration);

    return osc;
  }

  // Create pulse/arp sound
  createArpeggio(baseNote, startTime, pattern = [0, 4, 7, 12]) {
    const noteLength = 60 / this.tempo / 4; // 16th notes
    const scaleNotes = Object.values(PENTATONIC_SCALE);
    const baseIndex = scaleNotes.indexOf(baseNote) !== -1
      ? scaleNotes.indexOf(baseNote)
      : 0;

    pattern.forEach((offset, i) => {
      const noteIndex = (baseIndex + Math.floor(offset / 2)) % scaleNotes.length;
      const freq = scaleNotes[noteIndex];
      if (freq) {
        this.createSquareOsc(freq, startTime + (i * noteLength), noteLength * 0.8, 0.08);
      }
    });
  }

  // Schedule a measure of music
  scheduleMeasure(startTime) {
    const beatLength = 60 / this.tempo;
    const scaleNotes = Object.values(PENTATONIC_SCALE);
    const bassNotes = Object.values(BASS_NOTES);

    // Get current chord from progression
    const chordIndex = this.progression[this.progressionIndex % this.progression.length];

    // Bass note on beat 1 and 3
    this.createTriangleOsc(bassNotes[chordIndex % bassNotes.length], startTime, beatLength * 2, 0.15);
    this.createTriangleOsc(bassNotes[(chordIndex + 2) % bassNotes.length], startTime + beatLength * 2, beatLength * 2, 0.12);

    // Arpeggios - gentle and sparse
    if (Math.random() > 0.3) {
      const arpPatterns = [
        [0, 2, 4, 2],
        [0, 4, 2, 4],
        [4, 2, 0, 2],
        [0, 2, 4, 7],
      ];
      const pattern = arpPatterns[Math.floor(Math.random() * arpPatterns.length)];
      this.createArpeggio(scaleNotes[chordIndex % scaleNotes.length], startTime, pattern);
    }

    // Melody notes - very sparse and dreamy
    if (Math.random() > 0.5) {
      const melodyTime = startTime + beatLength * (Math.floor(Math.random() * 3) + 1);
      const melodyNote = scaleNotes[(chordIndex + Math.floor(Math.random() * 5)) % scaleNotes.length];
      this.createSquareOsc(melodyNote, melodyTime, beatLength * 1.5, 0.06);
    }

    // High sparkle notes occasionally
    if (Math.random() > 0.7) {
      const highNote = scaleNotes[scaleNotes.length - 1 - Math.floor(Math.random() * 3)];
      this.createSquareOsc(highNote, startTime + beatLength * 3, beatLength * 0.5, 0.03);
    }

    this.progressionIndex++;

    // Change progression occasionally
    if (this.progressionIndex % 16 === 0 && Math.random() > 0.5) {
      this.progression = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
    }
  }

  start() {
    if (this.isPlaying) return;

    this.init();

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isPlaying = true;
    this.progressionIndex = 0;

    const measureLength = (60 / this.tempo) * 4; // 4 beats per measure
    let nextMeasureTime = this.audioContext.currentTime + 0.1;

    const scheduleAhead = () => {
      if (!this.isPlaying) return;

      // Schedule measures ahead of time for smooth playback
      while (nextMeasureTime < this.audioContext.currentTime + 2) {
        this.scheduleMeasure(nextMeasureTime);
        nextMeasureTime += measureLength;
      }

      this.scheduleTimeout = setTimeout(scheduleAhead, 500);
    };

    scheduleAhead();
  }

  stop() {
    this.isPlaying = false;
    if (this.scheduleTimeout) {
      clearTimeout(this.scheduleTimeout);
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }
}

// Singleton instance
let generatorInstance = null;

function getGenerator() {
  if (!generatorInstance) {
    generatorInstance = new ChiptuneGenerator();
  }
  return generatorInstance;
}

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(30);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoStartPending, setAutoStartPending] = useState(true);
  const previousVolume = useRef(30);

  const generator = useRef(getGenerator());

  useEffect(() => {
    const gen = generator.current;
    const actualVolume = isMuted ? 0 : volume / 100;
    gen.setVolume(actualVolume);
  }, [volume, isMuted]);

  // Auto-start music on first user interaction (browsers require user gesture for audio)
  useEffect(() => {
    if (!autoStartPending) return;

    const startMusic = () => {
      const gen = generator.current;
      if (!gen.isPlaying) {
        gen.start();
        setIsPlaying(true);
      }
      setAutoStartPending(false);
      // Remove listeners after first interaction
      document.removeEventListener('click', startMusic);
      document.removeEventListener('keydown', startMusic);
      document.removeEventListener('touchstart', startMusic);
    };

    // Try to start immediately (will work if user has interacted before)
    const tryAutoStart = () => {
      const gen = generator.current;
      gen.init();
      if (gen.audioContext && gen.audioContext.state === 'running') {
        gen.start();
        setIsPlaying(true);
        setAutoStartPending(false);
      } else {
        // Wait for user interaction
        document.addEventListener('click', startMusic, { once: true });
        document.addEventListener('keydown', startMusic, { once: true });
        document.addEventListener('touchstart', startMusic, { once: true });
      }
    };

    // Small delay to let page load
    const timeout = setTimeout(tryAutoStart, 500);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', startMusic);
      document.removeEventListener('keydown', startMusic);
      document.removeEventListener('touchstart', startMusic);
    };
  }, [autoStartPending]);

  const handleTogglePlay = useCallback(() => {
    const gen = generator.current;
    const nowPlaying = gen.toggle();
    setIsPlaying(nowPlaying);
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const handleMuteToggle = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(previousVolume.current || 30);
    } else {
      previousVolume.current = volume;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 33) return '🔈';
    if (volume < 66) return '🔉';
    return '🔊';
  };

  return (
    <div className={`music-player ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="music-toggle-btn"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Music Controls"
      >
        🎵
      </button>

      {isExpanded && (
        <div className="music-controls">
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div className="volume-control">
            <button
              className="mute-btn"
              onClick={handleMuteToggle}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {getVolumeIcon()}
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              title={`Volume: ${volume}%`}
            />
          </div>

          <span className="music-label">8-bit Vibes</span>
        </div>
      )}
    </div>
  );
}
