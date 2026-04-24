# Markov Chain Music Composer

Lab 5 — Automated Composition | Web Audio

A browser-based music composer that learns an n-th order Markov chain from an input melody and generates new note sequences from it, played back via the WebAudio API.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Main app UI |
| `style.css` | Styles (light + dark mode) |
| `markov.js` | Chain learning + generation logic |
| `audio.js` | WebAudio playback engine |
| `ui.js` | DOM wiring |
| `blog.html` | Part III blog post |

## Running locally

No build step, no dependencies. Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## How it works

1. **Learn** — `buildChain(notes, order)` scans the input melody and builds a map from every n-gram state to a weighted count of what note follows it.
2. **Generate** — `generate(notes, order, length)` starts at a random state and samples the next note proportionally at each step. Dead-ends (states with no outgoing transitions) trigger a jump to a random known state.
3. **Play** — Each note spawns an `OscillatorNode` + `GainNode` with a short attack/decay envelope, scheduled via the WebAudio clock.

## Controls

- **Chain order (n)** — higher = more faithful to training data, less creative; lower = more novel, more wandering
- **Notes to generate** — length of output sequence
- **Tempo** — BPM
- **Waveform** — oscillator shape (sine, triangle, square, sawtooth)
- **Input melody** — editable; any space-separated note names from `C3`–`B5`, plus `R` for rest

## Valid note names

```
C3 D3 E3 F3 G3 A3 B3
C4 D4 E4 F4 G4 A4 B4
C5 D5 E5 F5 G5 A5 B5
R  (rest)
```
