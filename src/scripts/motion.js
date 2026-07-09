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
  const pinSection = document.querySelector('[data-pin-section]');
  const pinFrames = pinSection ? [...pinSection.querySelectorAll('[data-pin-frame]')] : [];
  const pinCards = pinFrames.map((f) => f.querySelector('[data-orbit-card]'));
  const pinNodes = pinFrames.map((f) => f.querySelector('[data-orbit-node]'));
  const pinProgressDots = pinSection ? [...pinSection.querySelectorAll('[data-pin-progress]')] : [];
  // 4 frames; frame 4 (AI) gets 15% more scroll-length than frames 1-3.
  const pinBoundaries = [0, 0.241, 0.482, 0.7229, 1];
  const meshEl = document.querySelector('[data-mesh]');
  const desktopFine = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;

  let pointerX = 0;
  let pointerY = 0;
  let driftX = 0;
  let driftY = 0;
  let dirty = true;
  let mx = 0;
  let my = 0;

  const markDirty = () => {
    dirty = true;
  };
  window.addEventListener('scroll', markDirty, { passive: true });
  window.addEventListener('resize', markDirty, { passive: true });

  /* --- Pointer-tilt on hover (.tilt-card), desktop + pointer:fine only --- */
  let activeTilt = null;
  if (desktopFine) {
    document.querySelectorAll('.tilt-card').forEach((card) => {
      card.addEventListener('mouseenter', () => (activeTilt = card));
      card.addEventListener('mouseleave', () => {
        if (activeTilt === card) activeTilt = null;
        card.style.transform = '';
      });
    });

    window.addEventListener(
      'mousemove',
      (e) => {
        mx = e.clientX;
        my = e.clientY;
        if (meshEl) {
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          pointerX = ((e.clientX - cx) / cx) * 8;
          pointerY = ((e.clientY - cy) / cy) * 8;
        }
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

      // Effect D(a): pinned "what we build" sequence. pin-outer is 400vh tall;
      // while it's pinned, rect.top runs from 0 down to -(height - 100vh).
      // Map that to 0..1, then to a ring rotation angle (piecewise-linear
      // across pinBoundaries so the AI frame keeps its extra dwell time).
      if (pinSection && pinFrames.length) {
        const rect = pinSection.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const prog = total > 0 ? Math.max(0, Math.min(1, -rect.top / total)) : 0;

        const n = pinFrames.length;
        const anglePerCard = 360 / n;
        const segAngles = [0, 90, 180, 270];
        let rotation = segAngles[segAngles.length - 1];
        for (let k = 0; k < pinBoundaries.length - 2; k++) {
          if (prog <= pinBoundaries[k + 1]) {
            const segStart = pinBoundaries[k];
            const segEnd = pinBoundaries[k + 1];
            const localT = segEnd > segStart ? (prog - segStart) / (segEnd - segStart) : 1;
            rotation = segAngles[k] + localT * (segAngles[k + 1] - segAngles[k]);
            break;
          }
        }

        // Orbit ring: every card sits on a circle around a shared center.
        // Whichever card is angularly closest to "front" (0deg) expands
        // into its full readable card at the center; the rest collapse to
        // small title pills out on the ring, continuously repositioning as
        // the ring rotation advances with scroll.
        const baseRadius = 230;
        // normDist span over which a card leaves/reaches the center. With 4
        // cards spaced 90deg apart, the handoff between neighbors happens at
        // the 45deg midpoint (normDist 0.25), so this needs to be at least
        // that wide or there's a dead zone mid-segment where the "closest"
        // card has already receded past the window before the incoming one
        // has entered it, and nothing is expanded at all. 0.32 keeps both
        // neighbors partially visible through the handoff for a crossfade
        // instead of a hard cut.
        const settleWindow = 0.32;
        let activeIdx = 0;
        let bestDist = Infinity;
        const computed = pinFrames.map((f, i) => {
          const baseAngle = i * anglePerCard;
          let angle = baseAngle - rotation;
          angle = ((angle % 360) + 360) % 360;
          const signed = angle > 180 ? angle - 360 : angle;
          const normDist = Math.abs(signed) / 180;
          if (normDist < bestDist) {
            bestDist = normDist;
            activeIdx = i;
          }
          return { f, signed, normDist };
        });

        computed.forEach(({ f, signed, normDist }, i) => {
          // Quick-ramp easing: a card is either at the center (t=0) or
          // fully out on the ring (t=1), with only a brief settleWindow
          // spent in between, so peripheral cards never linger at a
          // half-radius that would sit inside the expanded center card.
          const t = Math.min(normDist / settleWindow, 1);
          const eased = t * t * (3 - 2 * t);
          const radius = baseRadius * eased;
          const rad = (signed * Math.PI) / 180;
          const x = radius * Math.sin(rad);
          const y = -radius * Math.cos(rad);
          const tilt = signed * 0.06;
          f.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${tilt.toFixed(1)}deg)`;
          f.style.zIndex = String(Math.round((1 - eased) * 100));

          const cardOpacity = 1 - eased;
          const nodeOpacity = eased;
          const card = pinCards[i];
          const node = pinNodes[i];
          if (card) {
            card.style.opacity = cardOpacity.toFixed(2);
            card.style.transform = `scale(${(0.85 + cardOpacity * 0.15).toFixed(3)})`;
          }
          if (node) {
            node.style.opacity = nodeOpacity.toFixed(2);
          }
        });

        pinFrames.forEach((f, i) => f.classList.toggle('active', i === activeIdx));
        pinProgressDots.forEach((d, i) => d.classList.toggle('active', i === activeIdx));
      }

      dirty = false;
    }

    if (activeTilt) {
      const r = activeTilt.getBoundingClientRect();
      const px = (mx - r.left) / r.width;
      const py = (my - r.top) / r.height;
      const rotateY = (px - 0.5) * 12;
      const rotateX = (0.5 - py) * 12;
      activeTilt.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
