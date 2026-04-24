/**
 * audio.js
 * WebAudio playback engine for the Markov Chain Composer.
 *
 * Plays a sequence of note names (from NOTE_FREQS) one at a time
 * at a given BPM, using an oscillator + gain envelope per note.
 * Rests (R) produce silence but still consume time.
 */

"use strict";

let audioCtx    = null;   // shared AudioContext — recreated each play
let playTimeout = null;   // setTimeout handle for the current beat
let playing     = false;  // flag to abort mid-sequence

/**
 * Stop any in-progress playback and tear down the AudioContext.
 * Safe to call even if nothing is playing.
 */
function stopPlayback() {
  playing = false;
  if (playTimeout) {
    clearTimeout(playTimeout);
    playTimeout = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

/**
 * Play a sequence of note names.
 *
 * @param {string[]} notes       — array of note names (e.g. ["C4","G4","R"])
 * @param {number}   bpm         — beats per minute
 * @param {string}   waveform    — OscillatorNode type: "sine"|"triangle"|"square"|"sawtooth"
 * @param {function} onNote      — called with (index, noteName) each beat
 * @param {function} onDone      — called when sequence finishes or is stopped cleanly
 */
function playSequence(notes, bpm, waveform, onNote, onDone) {
  stopPlayback();

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  playing  = true;

  const secPerBeat  = 60 / bpm;
  const attackTime  = 0.012;                       // seconds
  const releaseEnd  = secPerBeat * 0.85;           // envelope release endpoint
  const noteOff     = secPerBeat * 0.90;           // oscillator stop time

  let idx = 0;

  function tick() {
    if (!playing || idx >= notes.length) {
      playing = false;
      if (typeof onDone === "function") onDone();
      return;
    }

    const note = notes[idx];
    const freq = NOTE_FREQS[note];

    if (typeof onNote === "function") onNote(idx, note);

    // Only emit sound for non-rest notes with a known frequency
    if (freq > 0 && audioCtx) {
      const now  = audioCtx.currentTime;
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = waveform;
      osc.frequency.setValueAtTime(freq, now);

      // Short attack → exponential decay
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + attackTime);
      gain.gain.exponentialRampToValueAtTime(0.001, now + releaseEnd);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + noteOff);
    }

    idx++;
    playTimeout = setTimeout(tick, secPerBeat * 1000);
  }

  tick();
}
