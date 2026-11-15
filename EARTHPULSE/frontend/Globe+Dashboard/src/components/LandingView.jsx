import React, { useEffect, useRef, useState } from 'react';
import './LandingView.css';

const TOTAL_FRAMES = 122;

const getFramePath = (index) => {
  const pad = String(index + 1).padStart(3, '0');
  return `/frames_hd/frame_${pad}.jpg`;
};

export default function LandingView({ onEnterMission }) {
  const [loadedCount, setLoadedCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [currentFrameNum, setCurrentFrameNum] = useState(0);

  const canvasRef = useRef(null);
  const warpCanvasRef = useRef(null);
  const heroRef = useRef(null);
  const whiteoutRef = useRef(null);

  // Telemetry refs for high-frequency direct DOM updates without React re-render lag
  const teleStageRef = useRef(null);
  const teleAltRef = useRef(null);
  const teleVelRef = useRef(null);
  const coordLatRef = useRef(null);
  const coordLonRef = useRef(null);
  const missionTimeRef = useRef(null);
  const trackerFillRef = useRef(null);
  const trackerPercentRef = useRef(null);

  const imagesRef = useRef(new Array(TOTAL_FRAMES));
  const animFrameRef = useRef(null);
  const autoPlayRef = useRef(false);
  const isWarpingRef = useRef(false);

  // Physics state
  const targetFrameRef = useRef(0);
  const currentFrameRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // 1. Preload 122 frames
  useEffect(() => {
    let count = 0;
    let isCancelled = false;

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = 'async';

      img.onload = () => {
        if (isCancelled) return;
        count++;
        setLoadedCount(count);
        if (count === TOTAL_FRAMES) {
          setIsLoaded(true);
        }
      };

      img.onerror = () => {
        if (isCancelled) return;
        count++;
        setLoadedCount(count);
        if (count === TOTAL_FRAMES) {
          setIsLoaded(true);
        }
      };

      img.src = getFramePath(i);
      imagesRef.current[i] = img;
    }

    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. High-speed 4K Canvas, LERP Scroll Physics, and Auto-Scroll Engine
  useEffect(() => {
    if (!isLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

    const warpCanvas = warpCanvasRef.current;
    const warpCtx = warpCanvas?.getContext('2d');

    // Canvas Resizing
    const resizeCanvas = () => {
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2.0), 3.0);
      const displayWidth = window.innerWidth;
      const displayHeight = window.innerHeight;

      if (canvas.width !== Math.round(displayWidth * dpr) || canvas.height !== Math.round(displayHeight * dpr)) {
        canvas.width = Math.round(displayWidth * dpr);
        canvas.height = Math.round(displayHeight * dpr);
      }

      if (warpCanvas && (warpCanvas.width !== displayWidth || warpCanvas.height !== displayHeight)) {
        warpCanvas.width = displayWidth;
        warpCanvas.height = displayHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // --- Interactive Mouse Wheel & Trackpad Scroll Scrubber ---
    const handleWheel = (e) => {
      // Manual scroll interrupts auto-scroll so user has full control
      if (autoPlayRef.current) {
        autoPlayRef.current = false;
        setAutoPlay(false);
      }
      const delta = (e.deltaY || 0) * 0.055;
      targetFrameRef.current = Math.min(Math.max(targetFrameRef.current + delta, 0), TOTAL_FRAMES - 1);
    };

    // --- Touch Swipe Scrubber for Mobile & Tablets ---
    let touchStartY = 0;
    const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (autoPlayRef.current) {
        autoPlayRef.current = false;
        setAutoPlay(false);
      }
      if (e.touches && e.touches[0]) {
        const touchY = e.touches[0].clientY;
        const delta = (touchStartY - touchY) * 0.18;
        touchStartY = touchY;
        targetFrameRef.current = Math.min(Math.max(targetFrameRef.current + delta, 0), TOTAL_FRAMES - 1);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Draw Image with Aspect-Ratio "Cover" Math
    const drawImageProp = (ctx, img, x, y, w, h) => {
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return;

      const r = Math.min(w / iw, h / ih);
      let nw = iw * r;
      let nh = ih * r;
      let ar = 1;

      if (nw < w) ar = w / nw;
      if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;
      nw *= ar;
      nh *= ar;

      let cx = (iw - w / (r * ar)) * 0.5;
      let cy = (ih - h / (r * ar)) * 0.5;
      let cw = w / (r * ar);
      let ch = h / (r * ar);

      if (cx < 0) cx = 0;
      if (cy < 0) cy = 0;
      if (cw > iw) cw = iw;
      if (ch > ih) ch = ih;

      ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
    };

    // Render loop with LERP smoothing
    let lastReportFrame = 0;
    const render = () => {
      // Auto-Scroll feature: smoothly advances through frames
      if (autoPlayRef.current) {
        targetFrameRef.current += 0.35;
        if (targetFrameRef.current >= TOTAL_FRAMES - 1) {
          targetFrameRef.current = TOTAL_FRAMES - 1;
          autoPlayRef.current = false;
          setAutoPlay(false);
        }
      }

      // LERP (0.12 damping factor)
      currentFrameRef.current += (targetFrameRef.current - currentFrameRef.current) * 0.12;
      const frameIndex = Math.min(Math.max(Math.round(currentFrameRef.current), 0), TOTAL_FRAMES - 1);
      const img = imagesRef.current[frameIndex];

      if (img && img.complete && img.naturalWidth > 0) {
        drawImageProp(ctx, img, 0, 0, canvas.width, canvas.height);
      }

      if (Math.abs(frameIndex - lastReportFrame) >= 2) {
        lastReportFrame = frameIndex;
        setCurrentFrameNum(frameIndex);
      }

      // Telemetry updates
      const progress = currentFrameRef.current / (TOTAL_FRAMES - 1);

      if (trackerFillRef.current) {
        trackerFillRef.current.style.height = `${progress * 100}%`;
      }
      if (trackerPercentRef.current) {
        trackerPercentRef.current.textContent = `${Math.round(progress * 100)}%`;
      }

      // Telemetry stages: Deep Space (36k km) -> Mesosphere (20k km) -> Stratosphere (12 km)
      if (progress < 0.35) {
        if (teleStageRef.current) teleStageRef.current.textContent = 'DEEP SPACE';
        const alt = Math.round(36000 - (progress / 0.35) * 16000);
        if (teleAltRef.current) teleAltRef.current.textContent = `${alt.toLocaleString()} KM`;
        if (teleVelRef.current) teleVelRef.current.textContent = '27,650 KM/H';
      } else if (progress < 0.70) {
        if (teleStageRef.current) teleStageRef.current.textContent = 'MESOSPHERE';
        const norm = (progress - 0.35) / 0.35;
        const alt = Math.round(20000 - norm * 16000);
        if (teleAltRef.current) teleAltRef.current.textContent = `${alt.toLocaleString()} KM`;
        if (teleVelRef.current) teleVelRef.current.textContent = '19,420 KM/H';
      } else {
        if (teleStageRef.current) teleStageRef.current.textContent = 'STRATOSPHERE';
        const norm = (progress - 0.70) / 0.30;
        const alt = Math.round(4000 - norm * 3988);
        if (teleAltRef.current) teleAltRef.current.textContent = `${Math.max(12, alt)} KM`;
        if (teleVelRef.current) teleVelRef.current.textContent = '2,840 KM/H';
      }

      // Coordinates jitter
      const latDeg = (28 + Math.sin(progress * 4) * 0.4).toFixed(3);
      const lonDeg = (80 + Math.cos(progress * 4) * 0.5).toFixed(3);
      if (coordLatRef.current) coordLatRef.current.textContent = `${latDeg}° N`;
      if (coordLonRef.current) coordLonRef.current.textContent = `${lonDeg}° W`;

      // Mission clock
      const elapsed = Date.now() - startTimeRef.current;
      const hrs = String(Math.floor(elapsed / 3600000)).padStart(2, '0');
      const mins = String(Math.floor((elapsed % 3600000) / 60000)).padStart(2, '0');
      const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
      if (missionTimeRef.current) missionTimeRef.current.textContent = `T+${hrs}:${mins}:${secs}`;

      // HERO CENTER BUTTON REVEAL CONDITION (When scroll progress >= 92% or frame >= 112)
      if (heroRef.current) {
        if (progress >= 0.92 || currentFrameRef.current >= 112) {
          heroRef.current.classList.add('visible');
        } else {
          heroRef.current.classList.remove('visible');
        }
      }

      // Whiteout overlay transition for cloud canopy
      if (whiteoutRef.current) {
        if (progress >= 0.95 || currentFrameRef.current >= 116.5) {
          whiteoutRef.current.style.opacity = '1';
        } else {
          whiteoutRef.current.style.opacity = '0';
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isLoaded]);

  // Auto-Scroll Toggle Function
  const toggleAutoPlay = () => {
    // If we were at the end, restart from top
    if (targetFrameRef.current >= TOTAL_FRAMES - 2) {
      targetFrameRef.current = 0;
      currentFrameRef.current = 0;
    }
    const next = !autoPlay;
    setAutoPlay(next);
    autoPlayRef.current = next;
  };

  // Hyperspace Warp Jump Animation
  const handleLaunchMission = (e) => {
    if (e) e.preventDefault();
    if (isWarpingRef.current) return;
    isWarpingRef.current = true;

    const warpCanvas = warpCanvasRef.current;
    if (!warpCanvas) {
      if (onEnterMission) onEnterMission();
      return;
    }

    warpCanvas.classList.add('active');
    const warpCtx = warpCanvas.getContext('2d');
    const w = warpCanvas.width;
    const h = warpCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const WARP_COUNT = 320;
    const warpStars = [];
    for (let i = 0; i < WARP_COUNT; i++) {
      warpStars.push({
        x: (Math.random() - 0.5) * w,
        y: (Math.random() - 0.5) * h,
        z: Math.random() * w,
        prevZ: 0,
      });
    }

    let speed = 4;
    const startWarpTime = performance.now();

    const renderWarp = (now) => {
      const elapsed = (now - startWarpTime) / 1000;
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
        isWarpingRef.current = false;
        if (onEnterMission) onEnterMission();
      }
    };

    requestAnimationFrame(renderWarp);
  };

  const loadPercent = Math.min(Math.round((loadedCount / TOTAL_FRAMES) * 100), 100);

  return (
    <div className="earthpulse-landing-wrapper select-none w-screen h-screen overflow-hidden fixed inset-0 z-50 bg-slate-950">
      {/* 1. Background Scanlines & Vignette Overlay */}
      <div className="hud-overlay">
        <div className="vignette" />
        <div className="hud-corners">
          <div className="corner top-left" />
          <div className="corner top-right" />
          <div className="corner bottom-left" />
          <div className="corner bottom-right" />
        </div>
      </div>

      {/* 2. NASA Preloader Screen */}
      {!isLoaded && (
        <div className="preloader">
          <div className="preloader-content">
            <div className="nasa-insignia">
              <div className="ring-pulse" />
              <div className="ring-pulse delayed" />
              <div className="insignia-center">
                <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" fill="none" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" stroke="#00f0ff" strokeOpacity="0.8" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#38bdf8" />
                  <path d="M2 12h20" stroke="#00f0ff" />
                  <circle cx="12" cy="12" r="3" fill="#00f0ff" />
                </svg>
              </div>
            </div>
            <h2 className="preloader-title font-mono tracking-widest">EARTHPULSE // MISSION SYSTEM</h2>
            <p className="preloader-sub font-mono">CALIBRATING 4K ULTRA-HD FRAME SEQUENCE BUFFER</p>

            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${loadPercent}%` }} />
            </div>

            <div className="preloader-stats font-mono">
              <span>{loadPercent}%</span>
              <span>{loadedCount} / {TOTAL_FRAMES} FRAMES</span>
              <span className="status-indicator">
                <span className="blink-dot" /> SYNCING
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Hyperspace Warp Jump Canvas */}
      <canvas ref={warpCanvasRef} id="warpCanvas" className="warp-canvas" />

      {/* 4. Sticky Visual Viewport containing 4K Canvas and Aerospace HUD */}
      <div className="viewport-sticky">
        {/* Main 4K Canvas */}
        <canvas ref={canvasRef} id="frameCanvas" />
        {/* Seamless Pure White Background Transition for Final Cloud Frame */}
        <div ref={whiteoutRef} className="whiteout-overlay" />

        {/* Header Navigation & Live Telemetry */}
        <header className="hud-header">
          <div className="brand">
            <div className="brand-icon">
              <span className="live-beacon" />
            </div>
            <div className="brand-text">
              <span className="brand-subtitle font-mono">NASA // DEEP SPACE DESCENT 4K</span>
            </div>
          </div>

          <div className="header-center-telemetry">
            <div className="telemetry-chip">
              <span className="lbl">STAGE</span>
              <span ref={teleStageRef} className="val">DEEP SPACE</span>
            </div>
            <div className="telemetry-chip">
              <span className="lbl">ALTITUDE</span>
              <span ref={teleAltRef} className="val">36,000 KM</span>
            </div>
            <div className="telemetry-chip">
              <span className="lbl">VELOCITY</span>
              <span ref={teleVelRef} className="val">27,650 KM/H</span>
            </div>
            <div className="telemetry-chip hidden-mobile">
              <span className="lbl">BUFFER</span>
              <span className="val highlight">4K UHD</span>
            </div>
          </div>

          <div className="header-controls flex items-center gap-2">
            {/* Auto-Scroll Toggle */}
            <button
              onClick={toggleAutoPlay}
              className={`hud-btn flex items-center gap-1.5 ${autoPlay ? 'active border-cyan-400 bg-cyan-950/80 text-cyan-300' : ''}`}
              title="Toggle Auto-Scroll Animation"
            >
              <svg className={`icon ${autoPlay ? 'animate-pulse text-cyan-400' : ''}`} viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                {autoPlay ? (
                  <>
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </>
                ) : (
                  <polygon points="5,3 19,12 5,21" />
                )}
              </svg>
              <span className="btn-label font-mono">{autoPlay ? 'PAUSE AUTO-SCROLL' : 'AUTO-SCROLL'}</span>
            </button>

            {/* Direct Skip to Dashboard */}
            <button
              onClick={handleLaunchMission}
              className="hud-btn border-cyan-500/60 text-cyan-300 hover:bg-cyan-950/80 font-mono"
              title="Direct Access to Globe & Dashboard"
            >
              <span className="btn-label">SKIP TO DASHBOARD ➔</span>
            </button>
          </div>
        </header>

        {/* Side Coordinates HUD */}
        <div className="side-hud side-hud-left">
          <div className="side-line" />
          <div className="hud-data-block">
            <span className="data-key">LAT:</span>
            <span ref={coordLatRef} className="data-val">00° 00' 00" N</span>
          </div>
          <div className="hud-data-block">
            <span className="data-key">LON:</span>
            <span ref={coordLonRef} className="data-val">00° 00' 00" W</span>
          </div>
          <div className="hud-data-block">
            <span className="data-key">TIME:</span>
            <span ref={missionTimeRef} className="data-val">T+00:00:00</span>
          </div>
        </div>

        {/* Side Sequence Progress HUD */}
        <div className="side-hud side-hud-right">
          <div className="scroll-tracker-label">SEQUENCE PROGRESS</div>
          <div className="tracker-track">
            <div ref={trackerFillRef} className="tracker-fill" />
            <div className="tracker-thumb" />
          </div>
          <div ref={trackerPercentRef} className="tracker-percent">0%</div>
        </div>

        {/* Scroll Instruction Cue (Subtle overlay during high altitude) */}
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-700 ${
            currentFrameNum > 15 || autoPlay ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-full bg-slate-950/70 border border-cyan-800/60 backdrop-blur-md shadow-lg shadow-cyan-950/40">
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-semibold uppercase animate-pulse">
              Scroll Down to Descend &bull; Or Click [Auto-Scroll] Above
            </span>
            <div className="w-4 h-7 rounded-full border border-cyan-400/50 flex items-start justify-center p-0.5">
              <div className="w-1.5 h-2 rounded-full bg-cyan-400 animate-bounce" />
            </div>
          </div>
        </div>

        {/* HERO SECTION CENTER PIECE: THE "EARTHPULSE" BUTTON */}
        <div ref={heroRef} className="hero-centerpiece">
          <div className="pulse-aura-container">
            <div className="radar-scan" />
            <div className="orbital-ring ring-1" />
            <div className="orbital-ring ring-2" />
            <div className="orbital-ring ring-3" />
          </div>

          {/* MAIN REQUIRED BUTTON WITH DEEP-SPACE STARS & NEBULA */}
          <button
            onClick={handleLaunchMission}
            id="earthPulseBtn"
            className="earthpulse-button"
            title="Launch Earthpulse Mission"
          >
            <div className="btn-space-bg">
              <div className="space-nebula" />
              <div className="space-stars stars-sm" />
              <div className="space-stars stars-md" />
              <div className="space-stars stars-lg" />
              <div className="space-shooting-star" />
            </div>
            <span className="btn-border-glow" />
            <span className="btn-sheen" />
            <span className="btn-content">
              <span className="btn-text">EARTHPULSE</span>
              <span className="btn-arrow">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </span>
            <span className="btn-tag font-mono">ENTER GLOBE &amp; DASHBOARD MISSION</span>
          </button>
        </div>

        {/* Bottom HUD Ticker */}
        <footer className="hud-footer">
          <div className="footer-left" />
          <div className="footer-right">
            <span>MISSION EP-4K // SYSTEM ARCHITECTURE 2026</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
