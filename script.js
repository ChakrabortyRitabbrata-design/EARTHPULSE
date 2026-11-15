/**
 * EARTHPULSE // 4K Orbital Scrollytelling Experience Engine
 * Smooth Canvas Frame Scrubbing, NASA Telemetry HUD, and Interactive Warp Transition
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 122;
  const FRAME_DIR = 'frames_hd';
  const FALLBACK_DIR = 'WhatsApp_Video_2026-11-15_at_11_11_44_frames';
  
  // Format frame filename: frame_001.jpg -> frame_122.jpg
  const getFramePath = (index, dir = FRAME_DIR) => {
    const pad = String(index + 1).padStart(3, '0');
    return `${dir}/frame_${pad}.jpg`;
  };

  // --- DOM Elements ---
  const canvas = document.getElementById('frameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  
  const warpCanvas = document.getElementById('warpCanvas');
  const warpCtx = warpCanvas.getContext('2d');

  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById('progressBar');
  const loadPercent = document.getElementById('loadPercent');
  const frameCounter = document.getElementById('frameCounter');

  const trackerFill = document.getElementById('trackerFill');
  const trackerPercent = document.getElementById('trackerPercent');

  const teleStage = document.getElementById('teleStage');
  const teleAlt = document.getElementById('teleAlt');
  const teleVel = document.getElementById('teleVel');

  const coordLat = document.getElementById('coordLat');
  const coordLon = document.getElementById('coordLon');
  const missionTime = document.getElementById('missionTime');

  const storyChapters = [
    document.getElementById('storyChapter0'),
    document.getElementById('storyChapter1'),
    document.getElementById('storyChapter2')
  ].filter(Boolean);

  const heroCenterPiece = document.getElementById('heroCenterPiece');
  const earthPulseBtn = document.getElementById('earthPulseBtn');
  const autoPlayBtn = document.getElementById('autoPlayBtn');

  // --- State Variables ---
  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let targetFrame = 0;
  let currentFrame = 0;
  let isAutoPlaying = false;
  let autoPlaySpeed = 0.45; // scroll speed per frame
  let destinationUrl = earthPulseBtn.getAttribute('data-dest') || 'about:blank';

  // Mission Start Time
  const startTime = Date.now();

  // --- High-DPI 4K Canvas Setup ---
  function resizeCanvas() {
    // 4K Ultra-HD Scaling buffer: up to devicePixelRatio or min 2.0 on high-res displays
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2.0), 3.0);
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    if (canvas.width !== Math.round(displayWidth * dpr) || canvas.height !== Math.round(displayHeight * dpr)) {
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);
    }

    if (warpCanvas.width !== displayWidth || warpCanvas.height !== displayHeight) {
      warpCanvas.width = displayWidth;
      warpCanvas.height = displayHeight;
    }

    renderCurrentFrame();
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });

  // --- Preload All 122 Frames ---
  function preloadFrames() {
    let loaded = 0;

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = 'async';

      img.onload = () => {
        loaded++;
        loadedCount = loaded;
        updatePreloaderProgress(loaded);

        if (loaded === TOTAL_FRAMES) {
          onAllFramesLoaded();
        }
      };

      img.onerror = () => {
        // Fallback to original extracted directory if frames_hd is inaccessible
        console.warn(`Falling back for frame ${i + 1}`);
        img.onerror = null;
        img.src = getFramePath(i, FALLBACK_DIR);
      };

      img.src = getFramePath(i);
      images[i] = img;
    }
  }

  function updatePreloaderProgress(count) {
    const percent = Math.round((count / TOTAL_FRAMES) * 100);
    progressBar.style.width = `${percent}%`;
    loadPercent.textContent = `${percent}%`;
    frameCounter.textContent = `${count} / ${TOTAL_FRAMES} FRAMES`;
  }

  function onAllFramesLoaded() {
    setTimeout(() => {
      preloader.classList.add('hidden');
      resizeCanvas();
      startRenderLoop();
    }, 400);
  }

  // --- Render Frame with Aspect-Ratio "Cover" Math ---
  function drawImageProp(ctx, img, x, y, w, h, offsetX = 0.5, offsetY = 0.5) {
    const iw = img.videoWidth || img.naturalWidth || img.width;
    const ih = img.videoHeight || img.naturalHeight || img.height;
    if (!iw || !ih) return;

    const r = Math.min(w / iw, h / ih);
    let nw = iw * r;
    let nh = ih * r;
    let cx = 1;
    let cy = 1;
    let cw = 1;
    let ch = 1;
    let ar = 1;

    // Cover behavior
    if (nw < w) ar = w / nw;
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;
    nw *= ar;
    nh *= ar;

    cw = iw / (nw / w);
    ch = ih / (nh / h);
    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
  }

  function renderCurrentFrame() {
    const frameIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentFrame)));
    const img = images[frameIndex];

    if (!img || !img.complete || img.naturalWidth === 0) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawImageProp(ctx, img, 0, 0, canvas.width, canvas.height);
  }

  // --- Smooth LERP Render Loop (Apple-style inertia) ---
  function startRenderLoop() {
    function loop() {
      // Linear interpolation towards target frame
      const delta = targetFrame - currentFrame;
      if (Math.abs(delta) > 0.001) {
        currentFrame += delta * 0.12;
        renderCurrentFrame();
        updateHUD();
      }

      // Handle Auto-Play mode
      if (isAutoPlaying) {
        window.scrollBy(0, 3.5);
        if (window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2) {
          isAutoPlaying = false;
          autoPlayBtn.classList.remove('active');
        }
      }

      // Update Live Mission Clock
      updateMissionClock();

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // --- Scroll Tracking & Progress Mapping ---
  function onScroll() {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, maxScroll > 0 ? scrollY / maxScroll : 0));

    targetFrame = progress * (TOTAL_FRAMES - 1);
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // --- Dynamic HUD & Telemetry Updates ---
  function updateHUD() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, maxScroll > 0 ? window.scrollY / maxScroll : 0));
    const percent = Math.round(progress * 100);

    // Tracker bar
    trackerFill.style.height = `${percent}%`;
    trackerPercent.textContent = `${percent}%`;

    // Stage, Altitude, Velocity telemetry formulas
    if (progress < 0.35) {
      teleStage.textContent = 'DEEP SPACE';
      const alt = Math.round(36000 - progress * 40000);
      teleAlt.textContent = `${alt.toLocaleString()} KM`;
      teleVel.textContent = '27,650 KM/H';
    } else if (progress < 0.70) {
      teleStage.textContent = 'ORBITAL DESCENT';
      const norm = (progress - 0.35) / 0.35;
      const alt = Math.round(22000 - norm * 18000);
      teleAlt.textContent = `${alt.toLocaleString()} KM`;
      teleVel.textContent = '19,420 KM/H';
    } else {
      teleStage.textContent = 'STRATOSPHERE';
      const norm = (progress - 0.70) / 0.30;
      const alt = Math.round(4000 - norm * 3988);
      teleAlt.textContent = `${Math.max(12, alt)} KM`;
      teleVel.textContent = '2,840 KM/H';
    }

    if (storyChapters.length > 0) {
      if (progress < 0.35) {
        storyChapters[0]?.classList.add('active');
        storyChapters[1]?.classList.remove('active');
        storyChapters[2]?.classList.remove('active');
      } else if (progress < 0.70) {
        storyChapters[0]?.classList.remove('active');
        storyChapters[1]?.classList.add('active');
        storyChapters[2]?.classList.remove('active');
      } else {
        storyChapters[0]?.classList.remove('active');
        storyChapters[1]?.classList.remove('active');
        storyChapters[2]?.classList.add('active');
      }
    }

    // Coordinates jitter slightly for realistic live telemetry
    const latDeg = (28 + Math.sin(progress * 4) * 0.4).toFixed(3);
    const lonDeg = (80 + Math.cos(progress * 4) * 0.5).toFixed(3);
    coordLat.textContent = `${latDeg}° N`;
    coordLon.textContent = `${lonDeg}° W`;

    // HERO SECTION CENTER BUTTON REVEAL CONDITION
    // When the photoframe completes (scroll progress >= 94% or frame >= 115)
    if (progress >= 0.93 || currentFrame >= 114) {
      heroCenterPiece.classList.add('visible');
      storyChapters.forEach(ch => ch.classList.remove('active'));
    } else {
      heroCenterPiece.classList.remove('visible');
    }

    // EXACT LAST FRAME WHITE BACKGROUND TRANSITION
    // Smoothly transitions the dull cloudy final frame into a clean pure white background
    if (progress >= 0.95 || currentFrame >= 116.5) {
      document.body.classList.add('last-frame-white');
    } else {
      document.body.classList.remove('last-frame-white');
    }
  }

  function updateMissionClock() {
    const elapsed = Date.now() - startTime;
    const hrs = String(Math.floor(elapsed / 3600000)).padStart(2, '0');
    const mins = String(Math.floor((elapsed % 3600000) / 60000)).padStart(2, '0');
    const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
    missionTime.textContent = `T+${hrs}:${mins}:${secs}`;
  }

  // --- Auto-Scrub Mode ---
  autoPlayBtn.addEventListener('click', () => {
    isAutoPlaying = !isAutoPlaying;
    if (isAutoPlaying) {
      autoPlayBtn.classList.add('active');
    } else {
      autoPlayBtn.classList.remove('active');
    }
  });

  // --- Warp Hyperspace Canvas Animation ---
  let warpStars = [];
  const WARP_COUNT = 300;

  function initWarpStars() {
    warpStars = [];
    const w = warpCanvas.width;
    const h = warpCanvas.height;
    for (let i = 0; i < WARP_COUNT; i++) {
      warpStars.push({
        x: (Math.random() - 0.5) * w,
        y: (Math.random() - 0.5) * h,
        z: Math.random() * w,
        prevZ: 0
      });
    }
  }

  function triggerWarpJump(onFinish) {
    warpCanvas.classList.add('active');
    initWarpStars();

    let speed = 4;
    const w = warpCanvas.width;
    const h = warpCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    let startTime = performance.now();

    function renderWarp(now) {
      const elapsed = (now - startTime) / 1000;
      speed += 1.8;

      warpCtx.fillStyle = 'rgba(3, 7, 18, 0.35)';
      warpCtx.fillRect(0, 0, w, h);

      for (let i = 0; i < warpStars.length; i++) {
        const star = warpStars[i];
        star.prevZ = star.z;
        star.z -= speed;

        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * w;
          star.y = (Math.random() - 0.5) * h;
          star.z = w;
          star.prevZ = star.z;
        }

        const k = 250 / star.z;
        const px = star.x * k + cx;
        const py = star.y * k + cy;

        const pk = 250 / star.prevZ;
        const ppx = star.x * pk + cx;
        const ppy = star.y * pk + cy;

        warpCtx.beginPath();
        warpCtx.strokeStyle = `rgba(0, 240, 255, ${Math.min(1, (1 - star.z / w) * 1.5)})`;
        warpCtx.lineWidth = Math.min(3.5, (1 - star.z / w) * 4);
        warpCtx.moveTo(ppx, ppy);
        warpCtx.lineTo(px, py);
        warpCtx.stroke();
      }

      if (elapsed < 1.3) {
        requestAnimationFrame(renderWarp);
      } else {
        warpCanvas.classList.remove('active');
        if (onFinish) onFinish();
      }
    }

    requestAnimationFrame(renderWarp);
  }

  // --- EARTHPULSE BUTTON CLICK HANDLER ---
  earthPulseBtn.addEventListener('click', (e) => {
    e.preventDefault();

    // Trigger futuristic hyperspace warp jump, then transition to blank page!
    triggerWarpJump(() => {
      const target = earthPulseBtn.getAttribute('href') || 'about:blank';
      window.open(target, '_blank', 'noopener,noreferrer');
    });
  });

  // --- Start Up ---
  preloadFrames();
})();
