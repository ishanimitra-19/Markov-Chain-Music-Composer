/**
 * markov.js
 * Pure Markov chain learning and generation — no external dependencies.
 *
 * Terminology:
 *   state  — a tuple of n consecutive notes (the "context")
 *   chain  — map from state string → { nextNote: count }
 *   order  — n (how many previous notes form a state)
 */

"use strict";

// All recognized note names and their frequencies (Hz).
// R = rest (silence).
const NOTE_FREQS = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
  A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  A5: 880.00, B5: 987.77,
  R: 0,
};

const VALID_NOTES = Object.keys(NOTE_FREQS);

/**
 * Parse a space-separated string of note names into an array,
 * filtering out anything that isn't a recognized note.
 * @param {string} input
 * @returns {string[]}
 */
function parseNotes(input) {
  return input.trim().split(/\s+/).filter(n => n in NOTE_FREQS);
}

/**
 * Learn an n-th order Markov chain from an array of notes.
 *
 * Example (order=1):
 *   notes = [C4, G4, A4, G4]
 *   chain = { "C4": {G4:1}, "G4": {A4:1, G4:1... }, ... }
 *
 * Example (order=2):
 *   notes = [C4, G4, A4, G4]
 *   chain = { "C4,G4": {A4:1}, "G4,A4": {G4:1} }
 *
 * @param {string[]} notes
 * @param {number} order  — positive integer
 * @returns {Object}      — the chain map
 */
function buildChain(notes, order) {
  if (notes.length < order + 1) return {};

  const chain = {};

  for (let i = 0; i <= notes.length - order - 1; i++) {
    const state = notes.slice(i, i + order).join(",");
    const next  = notes[i + order];

    if (!chain[state]) chain[state] = {};
    chain[state][next] = (chain[state][next] || 0) + 1;
  }

  return chain;
}

/**
 * Pick a random key from an object whose values are counts (weights).
 * @param {Object} counts  — { note: count }
 * @returns {string}
 */
function weightedRandom(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [key, weight] of Object.entries(counts)) {
    r -= weight;
    if (r <= 0) return key;
  }
  // Fallback (floating point edge case)
  return Object.keys(counts)[Object.keys(counts).length - 1];
}

/**
 * Generate a sequence of notes by walking the Markov chain.
 *
 * Strategy:
 *   1. Start from a random valid state in the chain.
 *   2. At each step, look up the current state and sample the next note.
 *   3. If a dead-end is reached (no outgoing transitions for the current
 *      state — happens at high orders with sparse data), jump to a random
 *      known state and continue.
 *
 * @param {string[]} notes   — original training notes
 * @param {number}   order
 * @param {number}   length  — number of notes to produce
 * @returns {string[]}
 */
function generate(notes, order, length) {
  const chain     = buildChain(notes, order);
  const allStates = Object.keys(chain);

  if (!allStates.length) return [];

  // Pick a random starting position in the training data
  const startIdx  = Math.floor(Math.random() * (notes.length - order));
  let   state     = notes.slice(startIdx, startIdx + order);
  const result    = [...state];

  for (let i = 0; i < length - order; i++) {
    const key = state.join(",");

    if (!chain[key]) {
      // Dead-end: jump to a random known state
      const fallbackKey = allStates[Math.floor(Math.random() * allStates.length)];
      state = fallbackKey.split(",");
      // Don't push state notes — just redirect; next iteration will sample
      i--; // retry this step
      continue;
    }

    const next = weightedRandom(chain[key]);
    result.push(next);
    state = [...state.slice(1), next];
  }

  return result.slice(0, length);
}

/**
 * Count total transition entries across all states in a chain.
 * @param {Object} chain
 * @returns {number}
 */
function countTransitions(chain) {
  return Object.values(chain).reduce(
    (sum, nexts) => sum + Object.keys(nexts).length, 0
  );
}
