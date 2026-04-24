/**
 * ui.js
 * Wires together the DOM, markov.js, and audio.js.
 * Runs after both scripts are loaded.
 */

"use strict";

/* ── Element references ── */
const inputMelody  = document.getElementById("inputMelody");
const orderSlider  = document.getElementById("orderSlider");
const lenSlider    = document.getElementById("lenSlider");
const bpmSlider    = document.getElementById("bpmSlider");
const waveSelect   = document.getElementById("waveSelect");
const orderVal     = document.getElementById("orderVal");
const lenVal       = document.getElementById("lenVal");
const bpmVal       = document.getElementById("bpmVal");
const learnBtn     = document.getElementById("learnBtn");
const playBtn      = document.getElementById("playBtn");
const stopBtn      = document.getElementById("stopBtn");
const statusEl     = document.getElementById("status");
const noteSeqEl    = document.getElementById("noteSeq");
const matrixWrap   = document.getElementById("matrixWrap");
const mStates      = document.getElementById("mStates");
const mTrans       = document.getElementById("mTrans");
const mGen         = document.getElementById("mGen");
const validNoteList = document.getElementById("validNoteList");

/* ── State ── */
let generated = [];   // most recently generated note sequence

/* ── Init ── */
validNoteList.textContent = VALID_NOTES.join("  ");

/* ── Slider readouts ── */
orderSlider.addEventListener("input", () => orderVal.textContent = orderSlider.value);
lenSlider.addEventListener("input",   () => lenVal.textContent   = lenSlider.value);
bpmSlider.addEventListener("input",   () => bpmVal.textContent   = bpmSlider.value);

/* ── Learn + Generate ── */
learnBtn.addEventListener("click", () => {
  const notes  = parseNotes(inputMelody.value);
  const order  = parseInt(orderSlider.value, 10);
  const length = parseInt(lenSlider.value, 10);

  if (notes.length < order + 2) {
    setStatus(`Need at least ${order + 2} valid notes for an order-${order} chain.`);
    return;
  }

  const chain = buildChain(notes, order);

  generated = generate(notes, order, length);

  // Update metrics
  mStates.textContent = Object.keys(chain).length;
  mTrans.textContent  = countTransitions(chain);
  mGen.textContent    = generated.length;

  // Render note pills
  renderNotes(generated);

  // Render transition matrix
  renderMatrix(chain);

  setStatus(
    `Learned order-${order} chain from ${notes.length} notes → generated ${generated.length} notes.`
  );

  playBtn.disabled = false;
  stopBtn.disabled = true;
});

/* ── Play ── */
playBtn.addEventListener("click", () => {
  if (!generated.length) return;

  const bpm      = parseInt(bpmSlider.value, 10);
  const waveform = waveSelect.value;

  playBtn.disabled = true;
  stopBtn.disabled = false;

  playSequence(
    generated,
    bpm,
    waveform,
    /* onNote */ (idx, note) => {
      highlightNote(idx);
      setStatus(`Playing note ${idx + 1} / ${generated.length}: ${note}`);
    },
    /* onDone */ () => {
      clearHighlights();
      playBtn.disabled = false;
      stopBtn.disabled = true;
      setStatus("Playback finished.");
    }
  );
});

/* ── Stop ── */
stopBtn.addEventListener("click", () => {
  stopPlayback();
  clearHighlights();
  playBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus("Stopped.");
});

/* ── Helpers ── */

function setStatus(msg) {
  statusEl.textContent = msg;
}

function renderNotes(notes) {
  noteSeqEl.innerHTML = notes
    .map((n, i) => `<span class="note-pill" id="np${i}">${n}</span>`)
    .join("");
}

function highlightNote(idx) {
  clearHighlights();
  const pill = document.getElementById("np" + idx);
  if (pill) {
    pill.classList.add("active");
    pill.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function clearHighlights() {
  document.querySelectorAll(".note-pill.active")
    .forEach(el => el.classList.remove("active"));
}

/**
 * Render a compact transition matrix table.
 * Shows up to 10 most-frequent states (rows) × up to 10 next-note columns.
 * Each cell shows the probability % and a proportional bar.
 *
 * @param {Object} chain
 */
function renderMatrix(chain) {
  const allStates = Object.keys(chain);
  if (!allStates.length) {
    matrixWrap.innerHTML = "<span class='placeholder'>No transitions found.</span>";
    return;
  }

  // Compute row totals for sorting and probability
  const rowTotals = {};
  allStates.forEach(s => {
    rowTotals[s] = Object.values(chain[s]).reduce((a, b) => a + b, 0);
  });

  // Top-10 states by frequency
  const topStates = [...allStates]
    .sort((a, b) => rowTotals[b] - rowTotals[a])
    .slice(0, 10);

  // Union of all next-notes that appear in those rows, capped at 10
  const nextNotes = [...new Set(topStates.flatMap(s => Object.keys(chain[s])))].slice(0, 10);

  /* Build table HTML */
  let html = "<table><thead><tr><th>state →</th>";
  nextNotes.forEach(n => { html += `<th>${n}</th>`; });
  html += "</tr></thead><tbody>";

  topStates.forEach(state => {
    html += `<tr><td class="row-label">${state}</td>`;
    nextNotes.forEach(n => {
      const cnt = chain[state][n] || 0;
      if (cnt === 0) {
        html += "<td></td>";
      } else {
        const pct    = cnt / rowTotals[state];
        const pctStr = Math.round(pct * 100) + "%";
        const barW   = Math.round(pct * 40);
        html += `<td>${pctStr}<span class="cell-bar" style="width:${barW}px"></span></td>`;
      }
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  matrixWrap.innerHTML = html;
}
