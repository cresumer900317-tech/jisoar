'use strict';
(() => {
  const video = document.getElementById('hero-video');
  const button = document.getElementById('hero-video-toggle');
  if (!video || !button) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 721px)');
  let userPaused = false;
  let failed = false;
  let inView = true;
  const allowed = () => desktop.matches && !reduced.matches && !navigator.connection?.saveData;
  const syncButton = () => { button.textContent = video.paused ? '배경 영상 재생' : '배경 영상 일시정지'; };
  const fail = () => { failed = true; video.pause(); video.hidden = true; button.hidden = true; };
  const update = () => {
    if (failed || !allowed()) { video.pause(); video.hidden = true; button.hidden = true; return; }
    video.hidden = false;
    button.hidden = false;
    if (!video.dataset.src) { fail(); return; }
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    if (!userPaused && !document.hidden && inView) video.play().catch(syncButton);
    else video.pause();
    syncButton();
  };
  video.addEventListener('error', fail);
  video.addEventListener('play', syncButton);
  video.addEventListener('pause', syncButton);
  button.addEventListener('click', () => {
    userPaused = !video.paused;
    if (userPaused) video.pause(); else video.play().catch(syncButton);
  });
  reduced.addEventListener('change', update);
  desktop.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  navigator.connection?.addEventListener('change', update);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(video.closest('section'));
  }
  update();
})();
