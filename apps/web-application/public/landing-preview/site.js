const config = window.STAGE_CONFIG || {};
const navigation = document.querySelector('.navigation');
const navScrim = document.querySelector('#nav-scrim');
const heroDownload = document.querySelector('.hero-cta');
const navDownload = navigation?.querySelector('.nav-download');
const mobileNavigation = window.matchMedia('(max-width: 767px)');
if (heroDownload && navDownload) {
  const updateDownloadVisibility = () => {
    const rect = heroDownload.getBoundingClientRect();
    const visible = !mobileNavigation.matches && rect.bottom > 0 && rect.top < window.innerHeight &&
      rect.right > 0 && rect.left < window.innerWidth;
    navigation.classList.toggle('hero-download-visible', visible);
    navDownload.inert = visible;
    navDownload.setAttribute('aria-hidden', String(visible));
  };
  updateDownloadVisibility();
  new IntersectionObserver(updateDownloadVisibility, {threshold: 0}).observe(heroDownload);
  window.addEventListener('pageshow', updateDownloadVisibility);
  window.addEventListener('resize', updateDownloadVisibility, {passive: true});
}

const hoverNavigation = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMenuMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Every [data-menu-toggle] opens the panel named by its aria-controls. Only one
// panel is open at a time; the navigation grows around whichever is open.
const navMenus = [...document.querySelectorAll('[data-menu-toggle]')]
  .map(toggle => ({toggle, menu: document.getElementById(toggle.getAttribute('aria-controls')),
    label: toggle.dataset.menuToggle, animation: null, openedByHover: false}))
  .filter(entry => entry.menu);
let menuCloseTimer = null;

function cancelMenuClose() {
  window.clearTimeout(menuCloseTimer);
}

function isOpen(entry) {
  return entry.toggle.getAttribute('aria-expanded') === 'true';
}

function setMenuOpen(entry, open, fromHover = false) {
  cancelMenuClose();
  if (isOpen(entry) === open) return;
  const {toggle, menu} = entry;
  if (open) {
    // Swap panels instantly so the navigation never animates two heights at once.
    navMenus.filter(other => other !== entry && isOpen(other)).forEach(other => {
      other.animation?.cancel();
      other.animation = null;
      other.toggle.setAttribute('aria-expanded', 'false');
      other.toggle.setAttribute('aria-label', `Open ${other.label} menu`);
      other.menu.hidden = true;
      other.menu.inert = true;
      other.menu.style.overflowY = '';
      other.openedByHover = false;
    });
  }
  const startHeight = menu.hidden ? 0 : menu.getBoundingClientRect().height;
  const startPadding = menu.hidden ? '0px' : getComputedStyle(menu).paddingTop;
  const startOpacity = menu.hidden ? 0 : getComputedStyle(menu).opacity;
  const startTransform = menu.hidden ? 'translateY(-8px)' : getComputedStyle(menu).transform;
  entry.animation?.cancel();
  entry.animation = null;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', `${open ? 'Close' : 'Open'} ${entry.label} menu`);
  navigation?.classList.toggle('product-menu-open', open);
  entry.openedByHover = open && fromHover;
  menu.inert = !open;
  if (navScrim) navScrim.hidden = !open;
  if (reducedMenuMotion.matches) {
    menu.hidden = !open;
    menu.style.overflowY = '';
    return;
  }
  menu.hidden = false;
  const endHeight = open ? menu.getBoundingClientRect().height : 0;
  const endPadding = open ? getComputedStyle(menu).paddingTop : '0px';
  menu.style.overflowY = 'hidden';
  const animation = menu.animate([
    {height: `${startHeight}px`, paddingTop: startPadding, opacity: startOpacity, transform: startTransform},
    {height: `${endHeight}px`, paddingTop: endPadding, opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(-8px)'}
  ], {duration: 280, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both'});
  entry.animation = animation;
  animation.onfinish = () => {
    if (entry.animation !== animation) return;
    menu.hidden = !open;
    menu.style.overflowY = '';
    animation.cancel();
    entry.animation = null;
  };
}

function openMenu() { return navMenus.find(isOpen); }
function closeMenu() { const entry = openMenu(); if (entry) setMenuOpen(entry, false); }
navMenus.forEach(entry => {
  entry.toggle.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && hoverNavigation.matches) setMenuOpen(entry, true, true);
  });
  entry.toggle.addEventListener('click', () => {
    // A click following hover keeps the menu open; a second click closes it.
    if (entry.openedByHover) {
      entry.openedByHover = false;
      cancelMenuClose();
      return;
    }
    setMenuOpen(entry, !isOpen(entry));
  });
  entry.menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
});
navigation?.addEventListener('pointerenter', cancelMenuClose);
navigation?.addEventListener('pointerleave', event => {
  if (event.pointerType !== 'mouse' || !hoverNavigation.matches) return;
  menuCloseTimer = window.setTimeout(() => {
    if (!navigation.contains(document.activeElement)) closeMenu();
  }, 180);
});
navScrim?.addEventListener('click', closeMenu);
document.querySelectorAll('.navigation a.nav-link').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  const entry = openMenu();
  if (event.key === 'Escape' && entry) {
    closeMenu(); entry.toggle.focus();
  }
});
document.addEventListener('focusin', event => {
  if (openMenu() && !event.target.closest('.navigation')) closeMenu();
});
const destinationDialog = document.querySelector('#destination-dialog');
const destinationLabels = {login:'Log in to Stage',contact:'Contact Stage',legal:'Legal',socials:'Stage on social media'};
document.addEventListener('click', event => {
  const button = event.target.closest('[data-destination]');
  if (!button) return;
  const kind = button.dataset.destination;
  const url = config[kind + 'Url'];
  if (url) { location.href = url; return; }
  closeMenu();
  document.querySelector('#destination-title').textContent = destinationLabels[kind];
  document.querySelector('#destination-message').textContent = 'This destination has not been connected in the Stage preview yet.';
  destinationDialog.showModal();
});
document.querySelectorAll('.dialog-close,.dialog-done').forEach(button => button.addEventListener('click', () => destinationDialog.close()));
destinationDialog?.addEventListener('click', event => {
  if (event.target !== destinationDialog) return;
  const rect = destinationDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) destinationDialog.close();
});
// Request the real installer once the redirected page has rendered.
// A retry remains available if the browser blocks automatic downloads.
const downloadStatus = document.querySelector('#download-status');
if (downloadStatus && config.installerUrl) {
  const installer = new URL(config.installerUrl, location.origin);
  if (['https:', 'http:'].includes(installer.protocol)) {
    const downloadLink = document.createElement('a');
    downloadLink.href = installer.href;
    downloadLink.download = config.installerFilename || 'Stage.dmg';
    downloadLink.textContent = 'Download again.';
    downloadLink.rel = 'noopener';
    // Cross-origin servers must send Content-Disposition: attachment.
    downloadStatus.replaceChildren('Your download should start automatically. ', downloadLink);
    window.setTimeout(() => downloadLink.click(), 300);
  }
}


// Scrub the supplied recording; keep only the newest target while a seek decodes.
(() => {
  const track = document.querySelector('[data-export-scroll]');
  if (!track) return;
  const demo = track.querySelector('.export-demo');
  const stage = track.querySelector('.export-stage');
  const video = track.querySelector('[data-export-film]');
  const steps = [...track.querySelectorAll('[data-export-step]')];
  const error = track.querySelector('[data-export-error]');
  const loading = track.querySelector('[data-export-loading]');
  const retry = track.querySelector('[data-export-retry]');
  let mediaUrl = null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 767px)');
  const manualPlayback = () => reduced.matches;
  const exportCopy = demo.querySelector('.export-copy');
  const exportHeader = demo.querySelector('.export-header');
  let pinned = false;
  let stickyTop = 104;
  let travel = 0;
  let frame = 0;
  let target = 0;
  let loaded = false;
  let failed = false;
  let manualSeek = false;
  let pendingChapter = null;
  let primed = false;
  let priming = null;
  const frameRate = 30;
  const clamp = value => Math.max(0, Math.min(1, value));
  const endTime = () => Math.max(0, video.duration - 1 / frameRate);

  function showStep(time) {
    const index = time >= 5.2 ? 2 : time >= 3.5 ? 1 : 0;
    steps.forEach((step, i) => step.setAttribute('aria-current', i === index ? 'step' : 'false'));
  }
  async function loadVideo() {
    if (loaded || failed) return;
    loaded = true;
    error.hidden = true;
    loading.hidden = false;
    video.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      // This small scrub clip must be completely local: the static host does
      // not honor byte-range requests, which stalls uncached Safari seeks.
      const response = await fetch(video.dataset.exportSrc, {signal: controller.signal});
      if (!response.ok) throw new Error('Export video request failed');
      const blob = await response.blob();
      if (!blob.size || !blob.type.startsWith('video/')) throw new Error('Invalid export video');
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
      mediaUrl = URL.createObjectURL(blob);
      video.muted = true;
      video.defaultMuted = true;
      video.preload = 'auto';
      video.src = mediaUrl;
      video.load();
    } catch {
      showVideoError();
    } finally {
      clearTimeout(timeout);
    }
  }
  function showVideoError() {
    failed = true;
    loading.hidden = true;
    error.hidden = false;
    video.setAttribute('aria-busy', 'false');
    measure();
  }
  retry.addEventListener('click', () => {
    failed = false;
    loaded = false;
    primed = false;
    priming = null;
    measure();
    loadVideo();
  });
  function primeVideo() {
    if (primed || priming || failed || manualPlayback() || video.readyState < 1) return;
    // A muted play/pause removes the poster and initializes the media decoder.
    // Some browsers otherwise ignore seeks until playback has started once.
    priming = video.play()
      .then(() => video.pause())
      .catch(() => video.removeAttribute('poster'))
      .finally(() => {
        primed = true;
        priming = null;
        seek();
      });
  }
  function seek() {
    if (failed || document.hidden || (manualPlayback() && !manualSeek) || video.readyState < 1 || video.seeking || !Number.isFinite(video.duration)) return;
    // Ask only for real encoded frames so tiny scroll changes do not trigger
    // redundant decoder work between frames.
    const time = Math.min(Math.round(target * frameRate) / frameRate, endTime());
    if (Math.abs(video.currentTime - time) < 1 / 60) { manualSeek = false; return; }
    video.pause();
    video.currentTime = time;
    showStep(time);
  }
  function progress() {
    if (pinned) return clamp((stickyTop - track.getBoundingClientRect().top) / travel);
    // Small phones and landscape screens use the complete timeline's travel.
    // A one-pixel video-only range cannot represent the intermediate chapters.
    if (mobile.matches) {
      return clamp((window.innerHeight * .75 - track.getBoundingClientRect().top) /
        Math.max(1, demo.offsetHeight + window.innerHeight * .5));
    }
    // Short desktop screens keep native page flow while the video crosses the viewport.
    const bounds = stage.getBoundingClientRect();
    const start = Math.max(stickyTop + 1, window.innerHeight - bounds.height);
    return clamp((start - bounds.top) / Math.max(1, start - stickyTop));
  }
  function renderScroll() {
    frame = 0;
    if (manualPlayback() || failed || document.hidden) return;
    const bounds = track.getBoundingClientRect();
    if (bounds.top > window.innerHeight + 1200 || bounds.bottom < -1200) return;
    loadVideo();
    if (Number.isFinite(video.duration)) {
      target = progress() * endTime();
      showStep(target);
      seek();
    }
  }
  function scheduleScroll() {
    if (!frame) frame = requestAnimationFrame(renderScroll);
  }
  function measure() {
    // On phones the introduction scrolls past before the timeline and film pin.
    // Restore the original hierarchy when returning to the desktop layout.
    if (mobile.matches && exportHeader.parentElement === exportCopy) track.before(exportHeader);
    else if (!mobile.matches && exportHeader.parentElement !== exportCopy) exportCopy.prepend(exportHeader);
    const height = demo.offsetHeight;
    const viewport = window.innerHeight;
    stickyTop = mobile.matches ? 88 : window.innerWidth < 810 ? 96 : 104;
    pinned = !manualPlayback() && !failed && height + stickyTop + (mobile.matches ? 16 : 24) <= viewport;
    travel = Math.round(mobile.matches ? Math.max(1000, viewport * 1.6) : Math.max(1200, viewport * 2.4));
    track.style.setProperty('--export-sticky-top', `${stickyTop}px`);
    track.style.setProperty('--export-demo-height', `${height}px`);
    track.style.setProperty('--export-travel', `${travel}px`);
    track.toggleAttribute('data-export-pinned', pinned);
    video.controls = manualPlayback() && !failed;
    if (reduced.matches) video.pause();
    scheduleScroll();
  }
  function selectStep(index) {
    pendingChapter = Number.isFinite(video.duration) ? null : index;
    target = Number(steps[index].dataset.exportStep);
    manualSeek = true;
    loadVideo();
    if (!manualPlayback() && Number.isFinite(video.duration)) {
      const fraction = target / endTime();
      let top;
      if (pinned) {
        top = window.scrollY + track.getBoundingClientRect().top - stickyTop + travel * fraction;
      } else if (mobile.matches) {
        top = window.scrollY + track.getBoundingClientRect().top - window.innerHeight * .75 +
          (demo.offsetHeight + window.innerHeight * .5) * fraction;
      } else {
        const bounds = stage.getBoundingClientRect();
        const start = Math.max(stickyTop + 1, window.innerHeight - bounds.height);
        top = window.scrollY + bounds.top - start + (start - stickyTop) * fraction;
      }
      const navigation = new CustomEvent('stage:scroll-to', {cancelable: true, detail: {top}});
      if (document.dispatchEvent(navigation)) window.scrollTo({top, behavior: 'instant'});
    }
    showStep(target);
    primeVideo();
    seek();
  }
  steps.forEach((step, index) => {
    step.addEventListener('click', () => selectStep(index));
    step.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % steps.length;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + steps.length - 1) % steps.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = steps.length - 1;
      else return;
      event.preventDefault();
      steps[next].focus({preventScroll: true});
      selectStep(next);
    });
  });
  video.addEventListener('loadedmetadata', () => {
    if (pendingChapter !== null) selectStep(pendingChapter);
    primeVideo();
    if (manualSeek) seek(); else scheduleScroll();
  });
  video.addEventListener('loadeddata', () => {
    loading.hidden = true;
    video.setAttribute('aria-busy', 'false');
    primeVideo();
    if (manualSeek) seek(); else scheduleScroll();
  });
  video.addEventListener('seeked', seek);
  video.addEventListener('canplay', () => { primeVideo(); seek(); });
  video.addEventListener('error', showVideoError);
  video.addEventListener('timeupdate', () => { if (manualPlayback()) showStep(video.currentTime); });
  window.addEventListener('scroll', scheduleScroll, {passive: true});
  window.addEventListener('resize', measure, {passive: true});
  window.addEventListener('pageshow', measure);
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else scheduleScroll(); });
  reduced.addEventListener('change', measure);
  mobile.addEventListener('change', measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(demo);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !manualPlayback()) { loadVideo(); scheduleScroll(); }
    }, {rootMargin: '1200px'});
    observer.observe(track);
  }
  if (document.fonts) document.fonts.ready.then(measure);
  track.setAttribute('data-export-enhanced', '');
  loadVideo();
  measure();
})();

// Two desktop testimonials, one mobile testimonial; native swipe remains available.
(() => {
  const section = document.querySelector('.testimonials');
  if (!section) return;
  const track = section.querySelector('.testimonial-track');
  const cards = [...track.children];
  const controls = section.querySelector('.testimonial-controls');
  const previous = controls.querySelector('[data-testimonial-prev]');
  const next = controls.querySelector('[data-testimonial-next]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
  const count = () => Math.max(1, Math.round((track.clientWidth + 24) / step()));
  const update = () => {
    previous.disabled = track.scrollLeft < 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  };
  const move = direction => track.scrollTo({left: track.scrollLeft + direction * count() * step(), behavior: reduced.matches ? 'instant' : 'smooth'});
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home' || event.key === 'End') track.scrollTo({left: event.key === 'Home' ? 0 : track.scrollWidth, behavior: reduced.matches ? 'instant' : 'smooth'});
    else move(event.key === 'ArrowRight' ? 1 : -1);
  });
  let timer;
  track.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(update, 120); }, {passive:true});
  new ResizeObserver(update).observe(track);
  controls.hidden = false;
  update();
})();
