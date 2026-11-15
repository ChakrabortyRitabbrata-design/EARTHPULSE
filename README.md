# EARTHPULSE // 4K Orbital Scrollytelling Experience

A high-performance, cinematic 4K scrollytelling web experience built for smooth video-like frame scrubbing, atmospheric NASA telemetry HUD, and an interactive hero centerpiece button **"EARTHPULSE"** that transitions to the next website.

---

## 🚀 Features

1. **4K Ultra-HD Video-Smooth Frame Scrubbing**:
   - **122 Enhanced Master Frames**: Upscaled and contrast-graded with bicubic interpolation.
   - **4K Dynamic Canvas Buffer**: Hardware-accelerated `<canvas>` dynamically scaled for Retina and 4K displays (`window.devicePixelRatio` scaling).
   - **LERP Motion Smoothing**: Linear interpolation ensures 60–120 FPS buttery smooth scrubbing whether using a trackpad, mouse wheel, or touch swipe.
   - **Intelligent Aspect-Ratio Cover**: Adapts dynamically to standard 16:9, ultrawide, tablet, or mobile screens without distortion or letterboxing.

2. **Hero Section "EARTHPULSE" Button**:
   - Placed in the exact center of the hero screen with animated multi-ring orbital radar waves.
   - Reveals automatically when the photoframe sequence completes (orbital descent through the clouds).
   - **Cloudy White Final Screen Transition**: Seamlessly transitions the background to your provided cloudy white sunset image (`cloud_white.avif`) at the exact final cloud frame to eliminate dull cloud artifacts while keeping the dark starry space button in bold contrast.
   - **Deep-Space & Starry Style**: Built-in cosmic background with twinkling starfield layers, drifting nebulae, and shooting star effects inside the button.
   - **Full White Typography**: High-contrast, clean `#ffffff` EARTHPULSE writing with glowing star-halo text shadow.
   - **Hyperspace Warp Jump**: On click, triggers a 3D starfield warp transition before opening a clean blank page (`about:blank`).

3. **Aerospace HUD & Live Telemetry**:
   - **Live Telemetry**: Real-time altitude (decreasing from 36,000 km to cloud canopy), orbital velocity, and live coordinate tracking.
   - **Auto-Scrub Mode**: Hands-free playback button to watch the entire sequence smoothly as a video.
   - **Unobstructed 4K Visuals**: Clean, distraction-free view focusing entirely on the high-resolution orbital descent.

---

## 🛠️ Quick Start

### Option 1: Direct File Open
Simply double-click or drag-and-drop `index.html` into Google Chrome, Microsoft Edge, Brave, or Firefox.

### Option 2: Local HTTP Server (Node.js)
Run the included zero-dependency server:
```bash
node server.js
```
Then navigate to:
```
http://localhost:3000
```

---

## 📁 File Structure

- `index.html` - Semantic structure, HUD telemetry layout, preloader, and EARTHPULSE hero centerpiece.
- `style.css` - Futuristic aerospace aesthetics, glowing borders, radar animations, and 4K responsive layout.
- `script.js` - High-speed frame preloader, 4K canvas rendering engine, LERP scroll physics, Web Audio synthesizer, and hyperspace warp effect.
- `server.js` - Lightweight Node.js static HTTP server with proper MIME types.
- `frames_hd/` - 122 high-definition 1080p master frame assets (`frame_001.jpg` to `frame_122.jpg`).
- `WhatsApp_Video_2026-11-15_at_11_11_44_frames/` - Original extracted source frames.
