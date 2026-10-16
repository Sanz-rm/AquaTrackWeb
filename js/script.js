(function () {
  'use strict';

  function canDownloadApk(response) {
    if (!response || !response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = Number(response.headers.get('content-length') || 0);
    return !contentType.toLowerCase().includes('text/html') && contentLength > 0;
  }

  if (typeof window !== 'undefined') {
    window.AquaTrackSite = Object.freeze({ canDownloadApk: canDownloadApk });
  }

  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const header = document.querySelector('[data-header]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const navigation = document.querySelector('[data-navigation]');
  const downloadLink = document.querySelector('[data-apk-download]');
  const downloadLabel = document.querySelector('[data-apk-label]');
  const downloadStatus = document.querySelector('[data-apk-status]');
  const currentYear = document.querySelector('[data-current-year]');

  root.classList.add('js');

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  function closeMenu() {
    if (!menuToggle || !navigation) {
      return;
    }

    menuToggle.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }

  if (menuToggle && navigation) {
    menuToggle.addEventListener('click', function () {
      const willOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', String(willOpen));
      navigation.classList.toggle('is-open', willOpen);
      document.body.classList.toggle('menu-open', willOpen);
    });

    navigation.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menuToggle.focus();
      }
    });
  }

  function updateHeader() {
    if (header) {
      header.classList.toggle('is-scrolled', window.scrollY > 16);
    }
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    root.classList.add('motion-ready');
    const observer = new IntersectionObserver(
      function (entries, currentObserver) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            currentObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add('is-visible');
    });
  }

  async function checkApkAvailability() {
    if (!downloadLink || !downloadLabel || !downloadStatus) {
      return;
    }

    const apkPath = downloadLink.dataset.apkPath;
    if (!apkPath || window.location.protocol === 'file:') {
      return;
    }

    downloadStatus.textContent = 'Comprobando disponibilidad de la APK…';

    try {
      const response = await fetch(apkPath, { method: 'HEAD', cache: 'no-store' });
      if (!canDownloadApk(response)) {
        downloadStatus.textContent = 'La APK se publicará próximamente.';
        return;
      }

      downloadLink.setAttribute('href', apkPath);
      downloadLink.setAttribute('download', 'aquatrack.apk');
      downloadLink.removeAttribute('aria-disabled');
      downloadLink.classList.remove('is-disabled');
      downloadLabel.textContent = 'Descargar APK';

      const contentLength = Number(response.headers.get('content-length') || 0);
      const sizeInMb = contentLength / (1024 * 1024);
      downloadStatus.textContent = sizeInMb >= 0.1
        ? 'APK disponible · ' + sizeInMb.toFixed(1).replace('.', ',') + ' MB'
        : 'APK disponible para descargar';
    } catch (_error) {
      downloadStatus.textContent = 'La APK se publicará próximamente.';
    }
  }

  checkApkAvailability();
})();
