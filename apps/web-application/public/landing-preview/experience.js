// Loop the example journey, with a two-second pause after the celebration.
(() => {
  const panel = document.querySelector('[data-flow-sequence]');
  if (!panel || !('IntersectionObserver' in window)) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const steps = [...panel.querySelectorAll('.flow-step')];
  let visible = false;
  let elapsed = 0;
  let previous = 0;
  let frame = 0;
  let finished = false;
  let celebration = null;
  let particles = [];
  let restElapsed = 0;
  const stepInterval = 700;
  const duration = steps.length * stepInterval;

  function render() {
    const current = Math.min(steps.length - 1, Math.floor(elapsed / stepInterval));
    steps.forEach((step, index) => {
      step.classList.toggle('is-visible', index <= current);
      step.classList.toggle('is-current', index === current);
      step.classList.toggle('is-complete', index < current);
    });
  }
  function clearCelebration() {
    particles.forEach(animation => animation.cancel());
    particles = [];
    celebration?.remove();
    celebration = null;
  }
  function celebrate() {
    if (reduced.matches || !Element.prototype.animate) return;
    celebration = document.createElement('div');
    celebration.className = 'flow-confetti';
    celebration.setAttribute('aria-hidden', 'true');
    panel.appendChild(celebration);
    const bounds = panel.getBoundingClientRect();
    const badge = steps[steps.length - 1].querySelector('.flow-step-number').getBoundingClientRect();
    const originX = badge.left - bounds.left + badge.width / 2;
    const originY = badge.top - bounds.top + badge.height / 2;
    const colors = ['#7565df', '#a99af0', '#d9b85c', '#8dbdae'];
    particles = Array.from({length:24}, (_, index) => {
      const piece = document.createElement('span');
      piece.style.left = `${originX}px`;
      piece.style.top = `${originY}px`;
      piece.style.backgroundColor = colors[index % colors.length];
      piece.style.borderRadius = index % 3 === 0 ? '50%' : '1px';
      celebration.appendChild(piece);
      const spread = (index / 23) * Math.min(bounds.width - originX - 12, 280) - 24;
      const rise = 50 + (index * 37 % 110);
      const rotation = (index % 2 ? 1 : -1) * (180 + index * 23);
      return piece.animate([
        {transform:'translate(0, 0) rotate(0deg) scale(.5)', opacity:0},
        {transform:`translate(${spread * .3}px, ${-rise * .75}px) rotate(${rotation * .25}deg) scale(1)`, opacity:1, offset:.2},
        {transform:`translate(${spread * .7}px, ${-rise}px) rotate(${rotation * .6}deg) scale(1)`, opacity:1, offset:.5},
        {transform:`translate(${spread}px, 45px) rotate(${rotation}deg) scale(.7)`, opacity:0}
      ], {duration:1100 + index % 3 * 90, delay:index % 5 * 24, easing:'linear', fill:'both'});
    });
    Promise.all(particles.map(animation => animation.finished)).then(clearCelebration).catch(() => {});
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; previous = 0; }
  function tick(now) {
    const delta = previous ? Math.min(now - previous, 100) : 0;
    previous = now;
    if (finished) {
      // Start the pause after the final confetti particle finishes.
      if (!celebration) restElapsed += delta;
      if (restElapsed >= 2000) {
        elapsed = 0;
        restElapsed = 0;
        finished = false;
        render();
      }
    } else {
      elapsed += delta;
      render();
      if (elapsed >= duration) {
        finished = true;
        restElapsed = 0;
        celebrate();
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    stop();
    if (reduced.matches) {
      clearCelebration();
      panel.removeAttribute('data-flow-enhanced');
      finished = true;
      elapsed = duration;
      render();
    } else {
      const playing = visible && !document.hidden;
      particles.forEach(animation => playing ? animation.play() : animation.pause());
      panel.setAttribute('data-flow-enhanced', '');
      if (playing) frame = requestAnimationFrame(tick);
    }
  }
  if (reduced.matches) sync();
  panel.setAttribute('data-flow-enhanced', '');
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }, { threshold: 0.15 });
  observer.observe(panel);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
})();

(() => {
  const player = document.querySelector('[data-launch-player]');
  if (!player) return;
  const video = player.querySelector('[data-launch-film]');
  const play = player.querySelector('[data-video-play]');
  const replay = player.querySelector('[data-video-replay]');
  const sound = player.querySelector('[data-video-sound]');
  const error = player.querySelector('[data-video-error]');
  if (!video || !play || !replay || !sound || !error) return;
  let started = false;

  function sync() {
    const state = video.ended ? 'ended' : video.paused ? 'paused' : 'playing';
    player.dataset.state = state;
    if (state === 'playing' || state === 'ended') started = true;
    if (state !== 'paused' && document.activeElement === play) video.focus({preventScroll:true});
    play.hidden = state !== 'paused';
    play.setAttribute('aria-label', started ? 'Resume video' : 'Play video');
    replay.hidden = !started;
    const muted = video.muted || video.volume === 0;
    sound.setAttribute('aria-pressed', String(muted));
    sound.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
  }

  async function togglePlayback() {
    error.hidden = true;
    if (!video.paused && !video.ended) {
      video.pause();
      return;
    }
    if (video.ended) video.currentTime = 0;
    if (video.error) video.load();
    try {
      await video.play();
    } catch (reason) {
      if (reason.name !== 'AbortError') {
        error.textContent = 'The video could not start. Press Play to try again.';
        error.hidden = false;
      }
    }
    sync();
  }

  play.addEventListener('click', togglePlayback);
  replay.addEventListener('click', () => {
    video.pause();
    video.currentTime = 0;
    togglePlayback();
  });
  video.addEventListener('click', togglePlayback);
  for (const event of ['play', 'pause', 'ended', 'volumechange']) video.addEventListener(event, sync);
  video.addEventListener('error', () => {
    error.textContent = 'The video could not load. Press Play to try again.';
    error.hidden = false;
    sync();
  });
  video.addEventListener('keydown', event => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      togglePlayback();
    } else if (['ArrowLeft', 'ArrowRight'].includes(event.key) && Number.isFinite(video.duration)) {
      event.preventDefault();
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + (event.key === 'ArrowRight' ? 5 : -5)));
    }
  });
  sound.addEventListener('click', () => {
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) video.volume = 1;
    } else video.muted = true;
    sync();
  });
  video.controls = false;
  sound.hidden = false;
  sync();
})();

(() => {
  const hero = document.querySelector('.hero-landscape');
  if (!hero) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const layers = [...hero.querySelectorAll('[data-parallax]')];
  const paragraphs = [...document.querySelectorAll('[data-reading]')];
  const readingGroups = [...new Set(paragraphs.map(element => element.closest('.problem-copy')))]
    .filter(Boolean)
    .map(element => ({
      element,
      words: [...element.querySelectorAll('.reading-word')].map(element => ({element, shade: -1}))
    }));
  let lenis = null;
  let scrollFrame = 0;

  // Keep explicit step navigation synchronized with Lenis's internal position.
  document.addEventListener('stage:scroll-to', event => {
    if (!lenis) return;
    event.preventDefault();
    lenis.scrollTo(event.detail.top, {immediate: true});
  });

  function renderScroll() {
    scrollFrame = 0;
    const y = window.scrollY;
    if (hero.getBoundingClientRect().bottom > 0) {
      for (const layer of layers) layer.style.transform = reducedMotion.matches ? '' : `translate3d(0,${y * Number(layer.dataset.parallax)}px,0)`;
    }
    const height = window.innerHeight;
    let previousEnd = -Infinity;
    for (const group of readingGroups) {
      const rect = group.element.getBoundingClientRect();
      // Adjacent paragraphs share one sequence; the video separates the next group.
      const start = Math.max(y + rect.top - height * .82, previousEnd);
      const end = start + Math.max(1, rect.height + height * .3);
      previousEnd = end;
      const progress = reducedMotion.matches ? 1 : Math.min(1, Math.max(0, (y - start) / (end - start)));
      const position = progress * group.words.length;
      group.words.forEach((word, index) => {
        // Scroll controls one word's color at a time, without overlapping transitions.
        const amount = Math.min(1, Math.max(0, position - index));
        const shade = Math.round(82 + 168 * amount);
        if (shade === word.shade) return;
        word.element.style.setProperty('--reading-color', `rgb(${shade},${shade},${shade})`);
        word.shade = shade;
      });
    }
  }
  function scheduleScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(renderScroll); }

  function configureMotion() {
    lenis?.destroy();
    lenis = null;
    if (!reducedMotion.matches && window.Lenis) {
      lenis = new window.Lenis({
        lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: true,
        anchors: { offset: -100 },
        prevent: node => Boolean(node.closest('#product-menu, dialog'))
      });
    }
    for (const layer of layers) layer.style.transform = '';
    for (const element of paragraphs) element.toggleAttribute('data-reading-enhanced', !reducedMotion.matches);
    scheduleScroll();
  }

  window.addEventListener('scroll', scheduleScroll, {passive:true});
  window.addEventListener('resize', scheduleScroll, {passive:true});
  reducedMotion.addEventListener('change', configureMotion);
  document.fonts?.ready.then(scheduleScroll);
  configureMotion();
})();

(() => {
  const gallery = document.querySelector('[data-integrations-gallery]');
  if (!gallery) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  function sync() {
    gallery.toggleAttribute('data-integrations-enhanced', !reducedMotion.matches);
    gallery.dataset.integrationsRunning = String(visible && !document.hidden && !reducedMotion.matches);
  }
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }).observe(gallery);
  sync();
})();

(() => {
  const flow = document.querySelector('[data-moodboard-flow]');
  if (!flow) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  function syncMotion() {
    flow.dataset.moodboardRunning = String(visible && !reducedMotion.matches && !document.hidden);
  }
  flow.dataset.moodboardEnhanced = '';
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      syncMotion();
    }, {threshold:0.15}).observe(flow);
  }
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
})();
// Demonstrate native scrolling without taking control after visitor interaction.
(() => {
  const viewport = document.querySelector('.research-page-scroll');
  if (!viewport) return;
  const pageImage = viewport.querySelector('img');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = !('IntersectionObserver' in window);
  let interacted = false;
  const mobileResearch = window.matchMedia("(max-width: 767px)");
  let touchPaused = false;
  let touching = false;
  let resumeTimer = 0;
  let frame = 0;
  let startedAt = null;

  function bounceOut(t) {
    const n = 7.5625;
    const d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
    return n * (t -= 2.625 / d) * t + .984375;
  }

  function render(time) {
    if (startedAt === null) startedAt = time;
    // Start after 500ms; pause exactly 2000ms after each completed bounce.
    const phase = (time - startedAt + 900) % 5300;
    const distance = Math.max(0, Math.min(160, viewport.clientHeight * .38, viewport.scrollHeight - viewport.clientHeight));
    let progress = 0;
    if (phase >= 1400 && phase < 2800) {
      const t = (phase - 1400) / 1400;
      progress = t * t * (3 - 2 * t);
    } else if (phase >= 2800 && phase < 3300) {
      progress = 1;
    } else if (phase >= 3300 && phase < 4700) {
      progress = 1 - bounceOut((phase - 3300) / 1400);
    }
    viewport.scrollTop = distance * progress;
    frame = requestAnimationFrame(render);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    startedAt = null;
    if (interacted) return;
    viewport.scrollTop = 0;
    if (visible && !document.hidden && !reducedMotion.matches && pageImage.complete && pageImage.naturalHeight > 0) {
      frame = requestAnimationFrame(render);
    }
  }

  function resumeAfterTouch() {
    window.clearTimeout(resumeTimer);
    if (!touchPaused || touching) return;
    resumeTimer = window.setTimeout(() => {
      touchPaused = false;
      interacted = false;
      syncMotion();
    }, 1800);
  }
  function takeControl(event) {
    // A normal swipe across the mockup must not disable its loop forever.
    if (mobileResearch.matches && (event.type === 'touchstart' || event.type === 'pointerdown')) {
      touchPaused = true;
      touching = true;
      window.clearTimeout(resumeTimer);
    } else if (event.type === 'keydown') {
      touchPaused = false;
      window.clearTimeout(resumeTimer);
    }
    interacted = true;
    syncMotion();
  }
  for (const event of ['touchend', 'touchcancel', 'pointerup', 'pointercancel']) {
    window.addEventListener(event, () => {
      if (!touchPaused) return;
      touching = false;
      resumeAfterTouch();
    }, {passive:true});
  }
  viewport.addEventListener('scroll', () => {
    if (touchPaused && !touching) resumeAfterTouch();
  }, {passive:true});
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'focusin']) {
    viewport.addEventListener(event, takeControl, {passive:true});
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .2;
      syncMotion();
    }, {threshold:[0, .2]}).observe(viewport);
  }
  pageImage.addEventListener('load', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
})();

// Skills and libraries feed Stage, hold for two seconds, then repeat while visible.
(() => {
  const flow = document.querySelector('[data-toolkit-flow]');
  if (!flow) return;
  const switches = [...flow.querySelectorAll('[data-toolkit-toggle]')];
  const status = flow.querySelector('[data-toolkit-status]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = !('IntersectionObserver' in window);
  let started = false;
  let demonstrating = false;
  let ticking = false;
  let frame = 0;
  let previous = null;
  let elapsed = 0;
  let queue = [];

  const selected = group => switches.filter(button => button.dataset.group === group && button.getAttribute('aria-checked') === 'true');
  const ready = () => selected('skills').length > 0 && selected('libraries').length > 0;
  const active = () => visible && !document.hidden;

  function updateCounts() {
    for (const group of ['skills', 'libraries']) {
      flow.querySelector(`[data-toolkit-count="${group}"]`).textContent = `${selected(group).length} active`;
    }
  }
  function setSelected(button, on) {
    button.setAttribute('aria-checked', String(on));
    button.closest('[data-toolkit-row]').toggleAttribute('data-selected', on);
    updateCounts();
  }
  function announce() {
    const message = ready()
      ? `${selected('skills').length} skills and ${selected('libraries').length} component libraries added to Stage in this demo.`
      : 'Select at least one skill and one component library to add them to Stage.';
    if (status.textContent !== message) status.textContent = message;
  }
  function tick(time) {
    frame = 0;
    if (!active()) { previous = null; return; }
    if (previous !== null) elapsed += time - previous;
    previous = time;
    ticking = true;
    while (queue.length && queue[0].at <= elapsed) queue.shift().run();
    ticking = false;
    if (queue.length) frame = requestAnimationFrame(tick);
    else previous = null;
  }
  function wake() {
    if (queue.length && active() && !frame && !ticking) frame = requestAnimationFrame(tick);
  }
  function later(delay, run) {
    queue.push({at: elapsed + delay, run});
    queue.sort((a, b) => a.at - b.at);
    wake();
  }
  function clearSequence() {
    demonstrating = false;
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
    elapsed = 0;
    queue = [];
    flow.removeAttribute('data-toolkit-feeding');
  }
  function feed() {
    if (!ready()) return;
    if (motion.matches) {
      flow.setAttribute('data-toolkit-connected', '');
      announce();
      return;
    }
    for (const group of ['skills', 'libraries']) {
      flow.querySelector(`[data-toolkit-feed="${group}"]`).toggleAttribute('data-active', selected(group).length > 0);
    }
    flow.setAttribute('data-toolkit-feeding', '');
    later(1100, () => flow.setAttribute('data-toolkit-connected', ''));
    later(2200, () => {
      flow.removeAttribute('data-toolkit-feeding');
      demonstrating = false;
      announce();
      later(2000, startDemo);
    });
  }
  function resetSelection() {
    // The 320ms switch transition finishes before the first selection at 500ms.
    switches.forEach(button => setSelected(button, false));
    flow.removeAttribute('data-toolkit-connected');
  }
  function showDefaults() {
    switches.forEach(button => setSelected(button, button.dataset.default === 'true'));
    flow.setAttribute('data-toolkit-connected', '');
    announce();
  }
  function startDemo() {
    started = true;
    clearSequence();
    if (motion.matches) { showDefaults(); return; }
    resetSelection();
    demonstrating = true;
    const defaults = switches.filter(button => button.dataset.default === 'true');
    [500, 1050, 1800, 2350].forEach((at, index) => later(at, () => setSelected(defaults[index], true)));
    later(2900, feed);
  }
  switches.forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      started = true;
      clearSequence();
      const on = button.getAttribute('aria-checked') !== 'true';
      setSelected(button, on);
      flow.removeAttribute('data-toolkit-connected');
      if (on && ready()) later(motion.matches ? 0 : 450, feed);
      else {
        flow.toggleAttribute('data-toolkit-connected', ready());
        announce();
      }
      if (!motion.matches && !(on && ready())) later(2000, startDemo);
    });
  });
  function sync() {
    flow.dataset.toolkitRunning = String(active());
    if (!active()) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = null;
      return;
    }
    if (!started) startDemo();
    else wake();
  }
  motion.addEventListener('change', () => {
    if (motion.matches) {
      const finishDemo = demonstrating;
      clearSequence();
      if (finishDemo) showDefaults();
      else if (started) {
        flow.toggleAttribute('data-toolkit-connected', ready());
        announce();
      }
    } else if (started) startDemo();
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .35;
      sync();
    }, {threshold:[0,.35]}).observe(flow);
  }
  resetSelection();
  sync();
})();
