// Custom cursor: desktop + pointer:fine only, dropped entirely on touch and
// under prefers-reduced-motion. Single rAF lerp loop, one passive mousemove
// listener, state resolved by class-delegation on mousemove (no per-element
// listeners).

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(pointer: fine)').matches;

if (!reduce && fine) {
  document.documentElement.classList.add('cursor-active');

  const root = document.createElement('div');
  root.className = 'cx-root';
  root.dataset.state = 'default';
  root.innerHTML =
    '<div class="cx-dot"></div><div class="cx-ring"></div><div class="cx-chip">→</div><div class="cx-ibeam"></div>';
  document.body.appendChild(root);

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let lx = mx;
  let ly = my;
  let state = 'default';
  let magnetEl = null;
  let lastParticle = 0;

  function classify(el) {
    if (!el) return { state: 'default', magnetEl: null };
    const btn = el.closest('.cursor-button');
    if (btn) return { state: 'button', magnetEl: btn };
    if (el.closest('.cursor-ai')) return { state: 'ai', magnetEl: null };
    if (el.closest('.cursor-link, a, button')) return { state: 'link', magnetEl: null };
    if (el.closest('p, h1, h2, h3, li') && !el.closest('a, button')) {
      return { state: 'text', magnetEl: null };
    }
    return { state: 'default', magnetEl: null };
  }

  window.addEventListener(
    'mousemove',
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      const next = classify(e.target instanceof Element ? e.target : null);
      if (next.state !== state) {
        state = next.state;
        root.dataset.state = state;
      }
      if (magnetEl !== next.magnetEl) {
        if (magnetEl) magnetEl.style.transform = '';
        magnetEl = next.magnetEl;
      }
    },
    { passive: true }
  );

  function spawnParticle(x, y) {
    const p = document.createElement('div');
    p.className = 'cx-particle';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 400);
  }

  function frame(t) {
    lx += (mx - lx) * 0.15;
    ly += (my - ly) * 0.15;
    root.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;

    if (magnetEl) {
      const r = magnetEl.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = Math.max(-4, Math.min(4, (mx - cx) * 0.15));
      const dy = Math.max(-4, Math.min(4, (my - cy) * 0.15));
      magnetEl.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    if (state === 'ai' && t - lastParticle > 90) {
      lastParticle = t;
      spawnParticle(lx, ly);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
