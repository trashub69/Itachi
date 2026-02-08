/**
 * Valentine page:
 * - "No" dodges by exploding into tiny birds + crow sfx,
 *   then reappears elsewhere and gathers birds back into the button.
 * - "Yes" pops white hearts + starts music + shows popup.
 *
 * Required DOM ids:
 *   #btnNo, #btnYes, #fxLayer, #sfxCrow, #bgMusic, #soundToggle
 */

const btnNo = document.getElementById("btnNo");
const btnYes = document.getElementById("btnYes");
const fxLayer = document.getElementById("fxLayer");

const sfxCrow = document.getElementById("sfxCrow");
const bgMusic = document.getElementById("bgMusic");
const soundToggle = document.getElementById("soundToggle");

// ---- config (änder hier easy text) ----
const CONFIG = {
  yesPopupText: "Yessss 💖",
  birdsCount: 22,
  appearDelayMs: 260,
};

let muted = false;
let musicStarted = false;

// Null-guards, damit nix crasht, wenn ein Element fehlt
if (sfxCrow) sfxCrow.volume = 0.9;
if (bgMusic) bgMusic.volume = 0.25;

// --- Sound toggle ---
if (soundToggle) {
  soundToggle.addEventListener("click", async () => {
    muted = !muted;

    if (sfxCrow) sfxCrow.muted = muted;
    if (bgMusic) bgMusic.muted = muted;

    soundToggle.textContent = muted ? "🔇" : "🔊";

    // Wenn Musik schon gestartet war und man unmuted -> weiterlaufen lassen
    if (!muted && bgMusic && musicStarted) {
      try { await bgMusic.play(); } catch {}
    }
  });
}

function playCrow() {
  if (!sfxCrow || muted) return;
  try {
    sfxCrow.currentTime = 0;
    sfxCrow.play().catch(() => {});
  } catch {}
}

/* ---------- Bird particle helpers ---------- */

function birdSVG() {
  return `
  <svg viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path class="wing"
      d="M5 45 C30 15, 45 15, 60 30 C75 15, 90 15, 115 45"
      stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function viewport() { return { w: window.innerWidth, h: window.innerHeight }; }

function rectCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

function spawnBird({ x, y, scale = 1, color = "white" }) {
  if (!fxLayer) return null;

  const d = document.createElement("div");
  d.className = "bird";
  d.innerHTML = birdSVG();

  const path = d.querySelector("path");
  if (path) path.setAttribute("stroke", color);

  fxLayer.appendChild(d);
  d.style.left = `${x}px`;
  d.style.top = `${y}px`;
  d.style.transform = `translate(-50%,-50%) scale(${scale})`;
  return d;
}

function animateBirdFlight(bird, from, to, { duration = 1000, drift = 0.25, flap = true } = {}) {
  if (!bird) return;

  const start = performance.now();
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // perpendicular drift for curve
  const nx = -dy;
  const ny = dx;
  const nlen = Math.hypot(nx, ny) || 1;
  const ux = nx / nlen;
  const uy = ny / nlen;

  const curve = (Math.random() < 0.5 ? -1 : 1) * drift * Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  // keep scale stable (no jitter)
  const baseScale = rand(0.95, 1.25);

  // randomize flap speed slightly
  if (flap) {
    const wing = bird.querySelector(".wing");
    if (wing) wing.style.animationDuration = `${rand(0.22, 0.34)}s`;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    const t = clamp((now - start) / duration, 0, 1);
    const e = easeOutCubic(t);

    // bend factor 0..1..0
    const bend = 1 - Math.pow(2 * e - 1, 2);

    const cx = from.x + dx * e + ux * curve * bend;
    const cy = from.y + dy * e + uy * curve * bend;

    // fade in/out
    let op = 1;
    if (t < 0.1) op = t / 0.1;
    else if (t > 0.9) op = (1 - t) / 0.1;

    bird.style.opacity = `${clamp(op, 0, 1)}`;
    bird.style.left = `${cx}px`;
    bird.style.top = `${cy}px`;
    bird.style.transform = `translate(-50%,-50%) rotate(${angle}deg) scale(${baseScale})`;

    if (t < 1) requestAnimationFrame(frame);
    else bird.remove();
  }

  requestAnimationFrame(frame);
}

function burstBirds(from, count = CONFIG.birdsCount) {
  const { w, h } = viewport();
  for (let i = 0; i < count; i++) {
    const bird = spawnBird({
      x: from.x + rand(-8, 8),
      y: from.y + rand(-8, 8),
      scale: rand(0.12, 0.22),
      color: "white",
    });

    const to = {
      x: clamp(from.x + rand(-0.28 * w, 0.28 * w), 10, w - 10),
      y: clamp(from.y + rand(-0.20 * h, 0.20 * h), 10, h - 10),
    };

    animateBirdFlight(bird, from, to, { duration: rand(850, 1450), drift: 0.35 });
  }
}

function gatherBirds(to, count = CONFIG.birdsCount) {
  const { w, h } = viewport();
  for (let i = 0; i < count; i++) {
    const start = {
      x: clamp(to.x + rand(-0.35 * w, 0.35 * w), 10, w - 10),
      y: clamp(to.y + rand(-0.28 * h, 0.28 * h), 10, h - 10),
    };

    const bird = spawnBird({
      x: start.x,
      y: start.y,
      scale: rand(0.12, 0.22),
      color: "white",
    });

    animateBirdFlight(bird, start, to, { duration: rand(900, 1600), drift: 0.30 });
  }
}

function popWhiteHearts(fromEl) {
  if (!fromEl) return;

  const r = fromEl.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  const count = 8;
  for (let i = 0; i < count; i++) {
    const h = document.createElement("div");
    h.className = "heart-pop";
    h.textContent = "♡";

    const ang = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 70;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - (30 + Math.random() * 40);

    h.style.left = `${cx}px`;
    h.style.top = `${cy}px`;
    h.style.setProperty("--dx", `${dx.toFixed(1)}px`);
    h.style.setProperty("--dy", `${dy.toFixed(1)}px`);

    document.body.appendChild(h);
    h.addEventListener("animationend", () => h.remove());
  }
}

/* ---------- Button dodge logic ---------- */

function findNewButtonPosition(btn) {
  const { w, h } = viewport();
  const r = btn.getBoundingClientRect();

  const pad = 16;
  const maxX = w - r.width - pad;
  const maxY = h - r.height - pad;

  const centerAvoid = { x: w / 2, y: h / 2 };
  const avoidRadius = Math.min(w, h) * 0.18;

  let x = pad, y = pad;
  for (let tries = 0; tries < 25; tries++) {
    x = rand(pad, Math.max(pad, maxX));
    y = rand(pad, Math.max(pad, maxY));
    const cx = x + r.width / 2;
    const cy = y + r.height / 2;
    if (Math.hypot(cx - centerAvoid.x, cy - centerAvoid.y) > avoidRadius) break;
  }
  return { left: x, top: y };
}

let dodging = false;

function dodge() {
  if (!btnNo || dodging) return;
  dodging = true;

  playCrow();

  const from = rectCenter(btnNo);
  burstBirds(from, CONFIG.birdsCount);

  btnNo.style.transition = "opacity .12s ease";
  btnNo.style.opacity = "0.05";

  const pos = findNewButtonPosition(btnNo);
  btnNo.style.position = "fixed";
  btnNo.style.left = `${pos.left}px`;
  btnNo.style.top = `${pos.top}px`;

  window.setTimeout(() => {
    const to = rectCenter(btnNo);
    gatherBirds(to, CONFIG.birdsCount);

    btnNo.style.transition = "opacity .18s ease";
    btnNo.style.opacity = "1";
    dodging = false;
  }, CONFIG.appearDelayMs);
}

/* Desktop hover */
if (btnNo) {
  btnNo.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") dodge();
  });

  /* Mobile tap */
  btnNo.addEventListener("touchstart", (e) => {
    e.preventDefault();
    dodge();
  }, { passive: false });

  /* Keyboard */
  btnNo.addEventListener("focus", () => dodge());
}

/* YES button */
if (btnYes) {
  btnYes.addEventListener("click", async () => {
    popWhiteHearts(btnYes);

    // ✅ Musik startet hier (und nur hier)
    if (bgMusic && !muted) {
      try {
        musicStarted = true;
        await bgMusic.play();
      } catch (err) {
        console.warn("bgMusic blocked:", err);
      }
    }

    alert(CONFIG.yesPopupText);
  });
}

/* ---------- Tiny smoke tests ---------- */
(function runSmokeTests() {
  try {
    console.assert(typeof dodge === "function", "dodge should exist");
    console.assert(!!btnNo, "btnNo exists");
    console.assert(!!btnYes, "btnYes exists");
    console.assert(!!fxLayer, "fxLayer exists");
  } catch (err) {
    console.warn("Smoke tests failed:", err);
  }
})();
