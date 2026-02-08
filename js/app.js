
/**
 * Valentine page: "No" dodges by exploding into tiny birds + crow sfx,
 * then reappears elsewhere and gathers birds back into the button.
 *
 * This is a template that should work out-of-the-box.
 * If you already have a perfected animation in your canvas version,
 * you can paste it here and keep the same DOM ids:
 *   #btnNo, #btnYes, #fxLayer, #sfxCrow, #bgMusic, #soundToggle
 */

const btnNo = document.getElementById("btnNo");
const btnYes = document.getElementById("btnYes");
const fxLayer = document.getElementById("fxLayer");

const sfxCrow = document.getElementById("sfxCrow");
const bgMusic = document.getElementById("bgMusic");
const soundToggle = document.getElementById("soundToggle");

let muted = false;
sfxCrow.volume = 0.9;
bgMusic.volume = 0.25;

function armMusicOnce(){
  // Browsers require user gesture for audio.
  bgMusic.play().catch(()=>{});
}
window.addEventListener("pointerdown", armMusicOnce, { once:true });
window.addEventListener("keydown", armMusicOnce, { once:true });

soundToggle.addEventListener("click", () => {
  muted = !muted;
  sfxCrow.muted = muted;
  bgMusic.muted = muted;
  soundToggle.textContent = muted ? "🔇" : "🔊";
  if(!muted) armMusicOnce();
});

function playCrow(){
  try{
    sfxCrow.currentTime = 0;
    sfxCrow.play().catch(()=>{});
  }catch{}
}

/* ---------- Bird particle helpers ---------- */

function birdSVG(){
  // Simple "M" bird silhouette. Feel free to replace with a cooler path.
  return `
  <svg viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path class="wing" d="M5 45 C30 15, 45 15, 60 30 C75 15, 90 15, 115 45"
      stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function rand(min, max){ return Math.random() * (max - min) + min; }

function viewport(){
  return { w: window.innerWidth, h: window.innerHeight };
}

function rectCenter(el){
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height };
}

function spawnBird({x,y, scale=1, color="white"}){
  const d = document.createElement("div");
  d.className = "bird";
  d.innerHTML = birdSVG();
  // allow recolor by stroke
  d.querySelector("path").setAttribute("stroke", color);

  fxLayer.appendChild(d);
  d.style.left = `${x}px`;
  d.style.top = `${y}px`;
  d.style.transform = `translate(-50%,-50%) scale(${scale})`;
  return d;
}

function animateBirdFlight(bird, from, to, {
  duration=900,
  drift=0.22, // curve strength
  flap=true
}={}){
  const start = performance.now();

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // perpendicular drift for curve
  const nx = -dy;
  const ny = dx;
  const nlen = Math.hypot(nx, ny) || 1;
  const ux = nx / nlen;
  const uy = ny / nlen;

  // random curve direction and magnitude
  const curve = (Math.random() < 0.5 ? -1 : 1) * drift * Math.hypot(dx, dy);

  // randomize flap speed slightly
  if(flap){
    const path = bird.querySelector(".wing");
    if(path){
      path.style.animationDuration = `${rand(0.22, 0.34)}s`;
    }
  }

  function easeOutCubic(t){ return 1 - Math.pow(1-t, 3); }

  function frame(now){
    const t = clamp((now - start) / duration, 0, 1);
    const e = easeOutCubic(t);

    // quadratic-ish curve using perpendicular offset
    const cx = from.x + dx * e + ux * curve * (1 - (2*e - 1)**2);
    const cy = from.y + dy * e + uy * curve * (1 - (2*e - 1)**2);

    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    bird.style.opacity = (t < 0.08) ? (t/0.08) : (t > 0.92 ? ((1-t)/0.08) : 1);
    bird.style.left = `${cx}px`;
    bird.style.top = `${cy}px`;
    bird.style.transform = `translate(-50%,-50%) rotate(${angle}deg) scale(${rand(0.9,1.25)})`;

    if(t < 1){
      requestAnimationFrame(frame);
    }else{
      bird.remove();
    }
  }
  requestAnimationFrame(frame);
}

function burstBirds(from, count=18){
  const {w,h} = viewport();
  for(let i=0;i<count;i++){
    const bird = spawnBird({
      x: from.x + rand(-8,8),
      y: from.y + rand(-8,8),
      scale: rand(0.12, 0.22),
      color: "white"
    });

    // fly outward
    const to = {
      x: clamp(from.x + rand(-0.28*w, 0.28*w), 10, w-10),
      y: clamp(from.y + rand(-0.20*h, 0.20*h), 10, h-10),
    };

    animateBirdFlight(bird, from, to, { duration: rand(700, 1200), drift: 0.35 });
  }
}

function gatherBirds(to, count=18){
  const {w,h} = viewport();
  for(let i=0;i<count;i++){
    const start = {
      x: clamp(to.x + rand(-0.35*w, 0.35*w), 10, w-10),
      y: clamp(to.y + rand(-0.28*h, 0.28*h), 10, h-10),
    };

    const bird = spawnBird({
      x: start.x,
      y: start.y,
      scale: rand(0.12, 0.22),
      color: "white"
    });

    animateBirdFlight(bird, start, to, { duration: rand(800, 1400), drift: 0.30 });
  }
}

/* ---------- Button dodge logic ---------- */

function findNewButtonPosition(btn){
  const {w,h} = viewport();
  const r = btn.getBoundingClientRect();

  // Keep inside viewport + safe padding
  const pad = 16;
  const maxX = w - r.width - pad;
  const maxY = h - r.height - pad;

  // avoid placing under the card center: keep it "somewhere else"
  const centerAvoid = { x: w/2, y: h/2 };
  const avoidRadius = Math.min(w,h) * 0.18;

  let x, y;
  for(let tries=0; tries<25; tries++){
    x = rand(pad, Math.max(pad, maxX));
    y = rand(pad, Math.max(pad, maxY));
    const cx = x + r.width/2;
    const cy = y + r.height/2;
    if(Math.hypot(cx-centerAvoid.x, cy-centerAvoid.y) > avoidRadius) break;
  }
  return { left: x, top: y };
}

let dodging = false;

function dodge(){
  if(dodging) return;
  dodging = true;

  playCrow();

  const from = rectCenter(btnNo);

  // Bird explosion
  burstBirds(from, 22);

  // Fade button a bit (but don't "remove" it)
  btnNo.style.transition = "opacity .12s ease";
  btnNo.style.opacity = "0.05";

  // Move button using fixed positioning so it can go anywhere
  const pos = findNewButtonPosition(btnNo);
  btnNo.style.position = "fixed";
  btnNo.style.left = `${pos.left}px`;
  btnNo.style.top = `${pos.top}px`;

  // Gather birds into new spot and restore opacity
  const appearDelay = 250;
  window.setTimeout(() => {
    const to = rectCenter(btnNo);
    gatherBirds(to, 22);

    btnNo.style.transition = "opacity .18s ease";
    btnNo.style.opacity = "1";
    dodging = false;
  }, appearDelay);
}

/* Desktop: hover dodge */
btnNo.addEventListener("pointerenter", (e) => {
  // if it's a mouse/trackpad hover -> dodge
  if(e.pointerType === "mouse") dodge();
});

/* Mobile: tap dodge */
btnNo.addEventListener("touchstart", (e) => {
  e.preventDefault();
  dodge();
}, { passive:false });

/* For keyboard users */
btnNo.addEventListener("focus", () => dodge());

btnYes.addEventListener("click", () => {
  alert("Yessss 💖");
});

/* ---------- Tiny test harness (open console) ---------- */
/* We don't have a full test runner in the browser, but at least sanity-check API usage. */
(function runSmokeTests(){
  try{
    console.assert(typeof dodge === "function", "dodge should exist");
    console.assert(document.getElementById("btnNo"), "btnNo exists");
    console.assert(document.getElementById("fxLayer"), "fxLayer exists");
  }catch(err){
    console.warn("Smoke tests failed:", err);
  }
})();
