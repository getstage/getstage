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

  // ── Hero Kanban: drag & drop ─────────────────────────────
  const kban = document.querySelector('.kban');
  if (kban) {
    const cards = kban.querySelectorAll('.kcard[draggable="true"]');
    const cols  = kban.querySelectorAll('.kcol');
    let dragging = null;

    cards.forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        dragging = card;
        kban.classList.add('is-interacted');
        card.classList.add('is-dragging');
        try { e.dataTransfer.effectAllowed = 'move'; } catch (_) {}
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        cols.forEach((c) => c.classList.remove('is-drop-over'));
        dragging = null;
      });
    });

    cols.forEach((col) => {
      col.addEventListener('dragover', (e) => {
        if (!dragging) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
        col.classList.add('is-drop-over');
      });
      col.addEventListener('dragleave', (e) => {
        if (e.relatedTarget && col.contains(e.relatedTarget)) return;
        col.classList.remove('is-drop-over');
      });
      col.addEventListener('drop', (e) => {
        if (!dragging) return;
        e.preventDefault();
        col.classList.remove('is-drop-over');
        const after = [...col.querySelectorAll('.kcard:not(.is-dragging)')]
          .find((c) => {
            const r = c.getBoundingClientRect();
            return e.clientY < r.top + r.height / 2;
          });
        if (after) col.insertBefore(dragging, after);
        else col.appendChild(dragging);

        // Auto-tick when dropped into Done; uncheck when leaving Done
        const chk = dragging.querySelector('.kchk');
        if (chk) {
          if (col.dataset.col === 'done') {
            chk.classList.add('kchk-on');
            chk.src = 'assets/hero/ic-check.svg';
          } else {
            chk.classList.remove('kchk-on');
            chk.src = 'assets/hero/ic-uncheck.svg';
          }
        }
      });
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
