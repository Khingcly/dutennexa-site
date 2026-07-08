// Duten Nexa motion layer: four independent effects, one rAF loop.
// Performance contract: only transform + opacity are animated; scroll/pointer
// handlers set a dirty flag and all work happens in the rAF loop with passive
// listeners. Everything hard-disables under prefers-reduced-motion.

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealEls = document.querySelectorAll('[data-reveal]');
const countEls = document.querySelectorAll('[data-count]');

function setCount(el, value) {
  el.textContent = value + (el.getAttribute('data-suffix') || '');
}

if (reduce) {
  // Set final states and exit: no observers, no loop, no listeners.
  revealEls.forEach((el) => el.classList.add('in-view'));
  countEls.forEach((el) => setCount(el, el.getAttribute('data-count')));
  const staticFill = document.querySelector('[data-os-fill]');
  if (staticFill) staticFill.style.transform = 'scaleX(1)';
} else {
  /* --- Effect A + B: reveal + count-up, driven by one observer --- */
  function animateCount(el) {
    const target = parseFloat(el.getAttribute('data-count') || '0');
    const duration = 1800;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(el, Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        if (entry.target.hasAttribute('data-count')) animateCount(entry.target);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );
  new Set([...revealEls, ...countEls]).forEach((el) => io.observe(el));

  /* --- Effect C + D: scroll progress, parallax, scroll-linked pulse, pointer drift --- */
  const progressBar = document.getElementById('scroll-progress');
  const parallaxEls = [...document.querySelectorAll('[data-parallax]')].map((el) => ({
    el,
    factor: parseFloat(el.getAttribute('data-parallax')) || 0.15,
    mesh: el.hasAttribute('data-mesh'),
  }));
  const osSection = document.querySelector('[data-os-section]');
  const osPulse = document.querySelector('[data-os-pulse]');
  const osFill = document.querySelector('[data-os-fill]');
  const meshEl = document.querySelector('[data-mesh]');
  const desktopFine = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;

  let pointerX = 0;
  let pointerY = 0;
  let driftX = 0;
  let driftY = 0;
  let dirty = true;

  const markDirty = () => {
    dirty = true;
  };
  window.addEventListener('scroll', markDirty, { passive: true });
  window.addEventListener('resize', markDirty, { passive: true });

  if (desktopFine && meshEl) {
    window.addEventListener(
      'mousemove',
      (e) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        pointerX = ((e.clientX - cx) / cx) * 8;
        pointerY = ((e.clientY - cy) / cy) * 8;
        markDirty();
      },
      { passive: true }
    );
  }

  function frame() {
    const drifting =
      desktopFine &&
      (Math.abs(pointerX - driftX) > 0.1 || Math.abs(pointerY - driftY) > 0.1);

    if (dirty || drifting) {
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const parallaxOn = window.innerWidth >= 768;

      // Effect C(a): scroll-progress bar
      if (progressBar) {
        progressBar.style.transform = `scaleX(${docH > 0 ? scrollY / docH : 0})`;
      }

      // Effect D(b): pointer-drift lerp toward target
      driftX += (pointerX - driftX) * 0.08;
      driftY += (pointerY - driftY) * 0.08;

      // Effect C(b): hero parallax (+ mesh pointer drift)
      for (const item of parallaxEls) {
        if (!parallaxOn) {
          item.el.style.transform = '';
          continue;
        }
        const y = Math.min(scrollY * item.factor, 120);
        const dx = item.mesh ? driftX : 0;
        const dy = item.mesh ? driftY : 0;
        item.el.style.transform = `translate3d(${dx}px, ${-y + dy}px, 0)`;
      }

      // Effect D(a): scroll-linked pulse + fill through the "what we build" connector.
      // Map the section's travel through the viewport to 0..1 and remap the middle
      // band to a full 0..100% sweep so the data visibly flows as you scroll.
      if (osSection && osPulse) {
        const rect = osSection.getBoundingClientRect();
        const vh = window.innerHeight;
        const raw = (vh - rect.top) / (rect.height + vh);
        const prog = Math.max(0, Math.min(1, (raw - 0.15) / 0.6));
        osPulse.style.transform = `translateX(${prog * 100}%)`;
        osPulse.style.opacity = prog > 0.01 && prog < 0.99 ? '1' : '0';
        if (osFill) osFill.style.transform = `scaleX(${prog})`;
      }

      dirty = false;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
