// Stage LP - small interactions
// 1) Pricing monthly/yearly toggle
// 2) Subtle scroll-reveal via IntersectionObserver

(() => {
  document.documentElement.classList.add('js');

  // ── Pricing toggle + Studio seat stepper ─────────────────
  const toggle = document.querySelector('.billing-toggle');
  const stepper = document.querySelector('.seat-stepper');
  const studioNum = document.querySelector('.is-studio-price');

  const currentPeriod = () => {
    const active = toggle?.querySelector('.bt-opt.is-active');
    return active?.dataset.period || 'monthly';
  };

  const updateStudioPrice = () => {
    if (!stepper || !studioNum) return;
    const period = currentPeriod();
    const seats = parseInt(stepper.dataset.seats, 10);
    const min = parseInt(stepper.dataset.min, 10);
    const base = parseInt(stepper.dataset[`base${period === 'yearly' ? 'Yearly' : 'Monthly'}`], 10);
    const extra = parseInt(stepper.dataset[`extra${period === 'yearly' ? 'Yearly' : 'Monthly'}`], 10);
    const total = base + Math.max(0, seats - min) * extra;
    studioNum.textContent = `$${total}`;
  };

  if (toggle) {
    const opts = toggle.querySelectorAll('.bt-opt');
    const nums = document.querySelectorAll('.price-num:not(.is-studio-price)');
    const pers = document.querySelectorAll('.price-per');
    opts.forEach((opt) => {
      opt.addEventListener('click', () => {
        opts.forEach((o) => {
          o.classList.toggle('is-active', o === opt);
          o.setAttribute('aria-selected', o === opt ? 'true' : 'false');
        });
        const period = opt.dataset.period;
        nums.forEach((n) => {
          const v = n.dataset[period];
          if (v) n.textContent = v;
        });
        pers.forEach((p) => {
          p.textContent = period === 'yearly' ? '/month, billed yearly' : '/month';
        });
        updateStudioPrice();
      });
    });
  }

  if (stepper) {
    const dec = stepper.querySelector('.seat-dec');
    const inc = stepper.querySelector('.seat-inc');
    const count = stepper.querySelector('.seat-count');
    const min = parseInt(stepper.dataset.min, 10);

    const render = () => {
      const seats = parseInt(stepper.dataset.seats, 10);
      count.textContent = seats;
      dec.disabled = seats <= min;
      updateStudioPrice();
    };

    dec.addEventListener('click', () => {
      const seats = parseInt(stepper.dataset.seats, 10);
      if (seats > min) {
        stepper.dataset.seats = seats - 1;
        render();
      }
    });
    inc.addEventListener('click', () => {
      const seats = parseInt(stepper.dataset.seats, 10);
      stepper.dataset.seats = seats + 1;
      render();
    });

    render();
  }

  // ── Hero dashboard sidebar (pane swap) ───────────────────
  const dash = document.querySelector('.dash');
  if (dash) {
    const items = dash.querySelectorAll('.ds-item[data-pane]');
    const panes = dash.querySelectorAll('.dash-pane[data-pane]');
    items.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.pane;
        items.forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        panes.forEach((p) => {
          p.classList.toggle('is-active', p.dataset.pane === target);
        });
        dash.dataset.active = target;
      });
    });
  }

  // ── Hero video: sound toggle + replay ────────────────────
  const heroVideo = document.getElementById('heroVideo');
  if (heroVideo) {
    const wrap = document.getElementById('heroVideoWrap');
    const soundBtn = document.getElementById('heroSoundBtn');
    const replayBtn = document.getElementById('heroReplayBtn');

    soundBtn.addEventListener('click', () => {
      heroVideo.muted = !heroVideo.muted;
      soundBtn.classList.toggle('is-on', !heroVideo.muted);
      soundBtn.setAttribute('aria-pressed', String(!heroVideo.muted));
      soundBtn.setAttribute('aria-label', heroVideo.muted ? 'Unmute video' : 'Mute video');
      if (heroVideo.paused && !heroVideo.ended) heroVideo.play().catch(() => {});
    });

    replayBtn.addEventListener('click', () => {
      heroVideo.currentTime = 0;
      wrap.classList.remove('is-ended');
      heroVideo.play().catch(() => {});
    });

    heroVideo.addEventListener('ended', () => wrap.classList.add('is-ended'));
    heroVideo.addEventListener('play', () => wrap.classList.remove('is-ended'));
  }

  // ── Testimonials: auto-advancing slider with progress bar ─
  const tstPeople = document.querySelector('.tst-people');
  const tstQuote = document.getElementById('tstQuote');
  if (tstPeople && tstQuote) {
    const people = Array.from(tstPeople.querySelectorAll('.tst-person'));
    const N = people.length;
    const quoteEl = tstQuote.closest('.tst-quote');
    const DURATION = 6000;        // time each testimonial stays on screen
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 600px)');
    let current = people.findIndex((p) => p.classList.contains('is-active'));
    if (current < 0) current = 0;
    let timer = null;
    let cycleStart = 0;     // performance.now() when the current bar began
    let remaining = DURATION;

    // Tag each original with its index; clones (mobile loop) carry the same idx.
    people.forEach((p, i) => { p.dataset.idx = i; });

    // On mobile the row becomes a looping slider: clone the full set on each
    // side so the active card always has neighbours — no blank edges.
    let cloned = false;
    const buildLoop = () => {
      if (cloned) return;
      const before = document.createDocumentFragment();
      const after = document.createDocumentFragment();
      people.forEach((p) => {
        const mk = () => {
          const c = p.cloneNode(true);
          c.classList.add('is-clone');
          c.classList.remove('is-active');
          c.setAttribute('aria-hidden', 'true');
          c.tabIndex = -1;
          return c;
        };
        before.appendChild(mk());
        after.appendChild(mk());
      });
      tstPeople.insertBefore(before, people[0]);
      tstPeople.appendChild(after);
      cloned = true;
    };
    const removeLoop = () => {
      if (!cloned) return;
      tstPeople.querySelectorAll('.tst-person.is-clone').forEach((c) => c.remove());
      cloned = false;
    };

    const allCards = () => Array.from(tstPeople.querySelectorAll('.tst-person'));
    const fillsFor = (i) => allCards()
      .filter((c) => +c.dataset.idx === i)
      .map((c) => c.querySelector('.tst-prog-fill'))
      .filter(Boolean);

    const clearBars = () => {
      tstPeople.querySelectorAll('.tst-prog-fill').forEach((f) => {
        f.style.transition = 'none'; f.style.width = '0%';
      });
    };

    // Animate the active bar(s) over `ms`, then advance to the next person
    const startCycle = (ms) => {
      clearTimeout(timer);
      remaining = ms;
      cycleStart = performance.now();
      if (!reduce) {
        fillsFor(current).forEach((f) => {
          // if resuming mid-way, keep the width it froze at, then run the rest
          const from = getComputedStyle(f).width;
          f.style.transition = 'none';
          f.style.width = from;
          void f.offsetWidth;
          f.style.transition = `width ${ms}ms linear`;
          f.style.width = '100%';
        });
      }
      timer = setTimeout(() => go((current + 1) % N), ms);
    };

    // Slider centering with a seamless loop. Center the instance of the active
    // card nearest the viewport, then silently re-home onto the middle copy so
    // both sides always have neighbours.
    let programmaticScroll = false;
    let scrollUnlock = null;
    let normalizeT = null;
    const isSlider = () => tstPeople.scrollWidth - tstPeople.clientWidth > 4;
    const scrollToCard = (el, instant) => {
      const left = el.offsetLeft - (tstPeople.clientWidth - el.clientWidth) / 2;
      programmaticScroll = true;
      clearTimeout(scrollUnlock);
      tstPeople.scrollTo({ left, behavior: (reduce || instant) ? 'auto' : 'smooth' });
      scrollUnlock = setTimeout(() => { programmaticScroll = false; }, 600);
    };
    const centerActive = (instant) => {
      if (!isSlider()) return;
      const cards = allCards();
      const viewCenter = tstPeople.scrollLeft + tstPeople.clientWidth / 2;
      let pick = -1, best = Infinity;
      cards.forEach((c, p) => {
        if (+c.dataset.idx !== current) return;
        const d = Math.abs((c.offsetLeft + c.clientWidth / 2) - viewCenter);
        if (d < best) { best = d; pick = p; }
      });
      if (pick < 0) return;
      scrollToCard(cards[pick], instant);
      // Re-home onto the middle copy (physical index current + N) — identical
      // card, so shifting by its offset is invisible but keeps neighbours on both sides.
      clearTimeout(normalizeT);
      normalizeT = setTimeout(() => {
        const home = current + N;
        if (pick === home || !cards[home]) return;
        const delta = cards[home].offsetLeft - cards[pick].offsetLeft;
        programmaticScroll = true;
        tstPeople.scrollLeft += delta;
        clearTimeout(scrollUnlock);
        scrollUnlock = setTimeout(() => { programmaticScroll = false; }, 80);
      }, (reduce || instant) ? 0 : 520);
    };

    const go = (i, opts) => {
      opts = opts || {};
      current = i;
      allCards().forEach((c) => {
        const on = +c.dataset.idx === i;
        c.classList.toggle('is-active', on);
        if (!c.classList.contains('is-clone')) {
          c.setAttribute('aria-selected', on ? 'true' : 'false');
        }
      });
      if (!opts.noCenter) centerActive(opts.instant);
      const next = people[i].dataset.quote || '';
      quoteEl?.classList.add('is-swapping');
      setTimeout(() => {
        tstQuote.textContent = next;
        quoteEl?.classList.remove('is-swapping');
      }, 200);
      clearBars();
      startCycle(DURATION);
      // If you activated a card the pointer is already resting on, keep it paused
      if (people[i].matches(':hover')) pauseBar();
    };

    // Freeze the active bar(s) where they are, banking the time that's left
    const pauseBar = () => {
      clearTimeout(timer);
      fillsFor(current).forEach((f) => {
        // Read the current interpolated width BEFORE cancelling the transition —
        // setting transition:none first would snap it to the 100% target.
        const w = getComputedStyle(f).width;
        f.style.transition = 'none';
        f.style.width = w;
      });
      remaining = Math.max(0, remaining - (performance.now() - cycleStart));
    };
    const resumeBar = () => startCycle(remaining > 0 ? remaining : DURATION);

    // Click via delegation so cloned cards are selectable too.
    tstPeople.addEventListener('click', (e) => {
      const card = e.target.closest('.tst-person');
      if (!card) return;
      const i = +card.dataset.idx;
      if (i !== current) go(i);
    });
    // Pause only when hovering the testimonial that's currently showing.
    people.forEach((btn, i) => {
      btn.addEventListener('mouseenter', () => { if (i === current) pauseBar(); });
      btn.addEventListener('mouseleave', () => { if (i === current) resumeBar(); });
    });

    // Manual swipe on the mobile slider selects the card nearest to centre,
    // then snaps + re-homes for the loop.
    let swipeTimer = null;
    tstPeople.addEventListener('scroll', () => {
      if (programmaticScroll || !isSlider()) return;
      clearTimeout(swipeTimer);
      swipeTimer = setTimeout(() => {
        const cards = allCards();
        const viewCenter = tstPeople.scrollLeft + tstPeople.clientWidth / 2;
        let nearest = -1, best = Infinity;
        cards.forEach((c, p) => {
          const d = Math.abs((c.offsetLeft + c.clientWidth / 2) - viewCenter);
          if (d < best) { best = d; nearest = p; }
        });
        if (nearest < 0) return;
        const i = +cards[nearest].dataset.idx;
        if (i !== current) go(i); else centerActive();
      }, 140);
    }, { passive: true });

    // Build / tear down the loop when crossing the mobile breakpoint.
    const syncMode = () => {
      if (mobile.matches) buildLoop(); else removeLoop();
      go(current, { instant: true, noCenter: !mobile.matches });
    };
    if (mobile.matches) buildLoop();
    if (mobile.addEventListener) mobile.addEventListener('change', syncMode);

    // Kick off only once the section scrolls into view
    if ('IntersectionObserver' in window) {
      const startObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { go(current, { instant: true }); startObs.disconnect(); }
        });
      }, { threshold: 0.35 });
      startObs.observe(tstPeople);
    } else {
      go(current, { instant: true });
    }
  }

  // ── FAQ accordion ────────────────────────────────────────
  const faqList = document.querySelector('.faq-list');
  if (faqList) {
    const items = Array.from(faqList.querySelectorAll('.faq-item'));
    items.forEach((item) => {
      const btn = item.querySelector('.faq-q');
      const panel = item.querySelector('.faq-a');
      const inner = item.querySelector('.faq-a-inner');
      if (!btn || !panel) return;

      const setOpen = (open) => {
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        if (inner) inner.inert = !open;
      };

      // Start collapsed
      setOpen(false);

      btn.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        // Accordion behaviour: close others when opening this one
        if (willOpen) items.forEach((other) => {
          if (other !== item && other.classList.contains('is-open')) {
            other.classList.remove('is-open');
            const ob = other.querySelector('.faq-q');
            const oi = other.querySelector('.faq-a-inner');
            ob?.setAttribute('aria-expanded', 'false');
            if (oi) oi.inert = true;
          }
        });
        setOpen(willOpen);
      });
    });
  }

  // ── Video lightbox ───────────────────────────────────────
  const videoModal = document.getElementById('videoModal');
  const modalVideo = document.getElementById('modalVideo');
  if (videoModal && modalVideo) {
    let lastFocused = null;

    const openModal = (trigger) => {
      lastFocused = trigger || document.activeElement;
      videoModal.classList.add('is-open');
      videoModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-modal-open');
      // A click opened this, so we have user activation — play with sound.
      modalVideo.currentTime = 0;
      modalVideo.muted = false;
      modalVideo.play().catch(() => {
        // Some browsers still block sound; fall back to muted autoplay.
        modalVideo.muted = true;
        modalVideo.play().catch(() => {});
      });
      videoModal.querySelector('.video-modal-close')?.focus();
    };

    const closeModal = () => {
      videoModal.classList.remove('is-open');
      videoModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-modal-open');
      modalVideo.pause();
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    };

    document.querySelectorAll('[data-video-open]').forEach((btn) => {
      btn.addEventListener('click', () => openModal(btn));
    });
    videoModal.querySelectorAll('[data-video-close]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && videoModal.classList.contains('is-open')) closeModal();
    });
  }

  // ── Scroll reveal ─────────────────────────────────────────
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !targets.length) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -4% 0px' });
  targets.forEach((el) => io.observe(el));

  // Safety: anything still hidden after 4s gets revealed (covers print, headless, etc.)
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.is-in)').forEach((el) => el.classList.add('is-in'));
  }, 4000);
})();
