class ChuteCanvas {
  constructor(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to acquire canvas context.");
    this.canvas = canvas;
    this.ctx = ctx;
    this.doorTarget = 1;
    this.doorProgress = 1;
    this.rafId = null;
    this.lerpFactor = 0.08;
    this.tunnelSpeed = 0.44;
    this.tunnelRadius = 18;
    this.ringLineWidth = 2;
    this.pulseDirection = "in";
    this.pulseColors = {
      base: { r: 130, g: 130, b: 130 },
      glow: { r: 80, g: 255, b: 255 },
    };
    this.cachedWidth = 0;
    this.cachedHeight = 0;
    this.particles = [];
    this.particleCount = 30;
    this.particleSpawnRate = 0.02;

    this.handleResize = this.resize.bind(this);
    this.resize();
    window.addEventListener("resize", this.handleResize);
  }

  start() {
    if (this.rafId !== null) return;
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.cachedWidth,
        y: Math.random() * this.cachedHeight,
        z: Math.random(),
        speed: 0.01 + Math.random() * 0.02,
        size: 1 + Math.random() * 2,
      });
    }
    const tick = (now) => {
      this.render(now);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.cachedWidth = rect.width;
    this.cachedHeight = rect.height;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }

  render(now) {
    this.doorProgress += (this.doorTarget - this.doorProgress) * this.lerpFactor;
    if (Math.abs(this.doorTarget - this.doorProgress) < 0.001) {
      this.doorProgress = this.doorTarget;
    }
    let tunnelPhase = ((now / 1000) * this.tunnelSpeed) % 1;
    if (tunnelPhase < 0) tunnelPhase += 1;
    this.updateParticles();
    this.drawFunnelDoors(this.cachedWidth, this.cachedHeight, this.doorProgress, tunnelPhase);
  }

  updateParticles() {
    const width = this.cachedWidth;
    const height = this.cachedHeight;
    if (width === 0 || height === 0) return;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (this.pulseDirection === "in") {
        p.z += p.speed;
        if (p.z >= 1) {
          p.z = 0;
          p.x = Math.random() * width;
          p.y = Math.random() * height;
        }
      } else {
        p.z -= p.speed;
        if (p.z <= 0) {
          p.z = 1;
          p.x = Math.random() * width;
          p.y = Math.random() * height;
        }
      }
    }

    if (Math.random() < this.particleSpawnRate && this.particles.length < this.particleCount * 1.5) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: this.pulseDirection === "in" ? 0 : 1,
        speed: 0.01 + Math.random() * 0.02,
        size: 1 + Math.random() * 2,
      });
    }
  }

  getSurfaceColor() {
    return getComputedStyle(document.body).getPropertyValue("--surface").trim() || "#e7edf4";
  }

  getDoorStrokeColor() {
    return getComputedStyle(document.body).getPropertyValue("--chute-door-stroke").trim() || "#b6bcc4";
  }

  drawRoundedRect(x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + width - r, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    this.ctx.lineTo(x + width, y + height - r);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    this.ctx.lineTo(x + r, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  drawTunnel(width, height, phase) {
    this.ctx.fillStyle = "#0a0f16";
    this.ctx.fillRect(0, 0, width, height);

    const rings = 20;
    const minSize = Math.min(width, height);
    const baseRings = 10;
    const baseGap = Math.max(6, minSize / (baseRings * 1.4));
    const desiredMaxInset = (baseRings - 1) * baseGap + 2;
    const gap = Math.max(4, (desiredMaxInset - 2) / (rings - 1));
    const glowColor = this.pulseColors.glow;

    this.ctx.save();
    this.ctx.lineWidth = this.ringLineWidth;
    const ringCornerRadius = this.tunnelRadius;

    for (let i = 0; i < rings; i++) {
      const inset = i * gap + 2;
      const ringWidth = Math.max(0, width - inset * 2);
      const ringHeight = Math.max(0, height - inset * 2);
      if (ringWidth <= 0 || ringHeight <= 0) continue;

      const normalizedPos = i / (rings - 1);
      let phaseOffset = i * 0.12;
      if (this.pulseDirection === "in") {
        phaseOffset *= 1 + normalizedPos * 0.8;
      } else {
        phaseOffset *= 1 + (1 - normalizedPos) * 0.8;
      }

      let localPhase;
      if (this.pulseDirection === "in") {
        localPhase = ((1 - phase + phaseOffset) % 1 + 1) % 1;
      } else {
        localPhase = ((phase + phaseOffset) % 1 + 1) % 1;
      }
      const glow = Math.max(0, Math.sin(localPhase * Math.PI * 2));

      const fadeToCenter = Math.max(0, 1 - (i / (rings - 1)) * 1.5);
      if (fadeToCenter <= 0) continue;

      const offAlpha = 0.14;
      const alpha = offAlpha + (fadeToCenter - offAlpha) * glow;
      const r = Math.round(glowColor.r);
      const g = Math.round(glowColor.g);
      const b = Math.round(glowColor.b);
      this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      this.drawRoundedRect(inset, inset, ringWidth, ringHeight, ringCornerRadius);
      this.ctx.stroke();
    }

    this.ctx.restore();
    this.drawParticles(width, height);
  }

  drawParticles(width, height) {
    const particleColor = this.pulseDirection === "in"
      ? { r: 80, g: 255, b: 255 }
      : { r: 255, g: 150, b: 60 };

    const centerX = width / 2;
    const centerY = height / 2;

    for (const p of this.particles) {
      const depthFactor = this.pulseDirection === "in" ? p.z : 1 - p.z;
      const size = p.size * 0.5;
      const opacity = 1 - p.z;
      const projectionFactor = this.pulseDirection === "in" ? (1 - depthFactor) : depthFactor;
      const projectedX = centerX + (p.x - centerX) * projectionFactor;
      const projectedY = centerY + (p.y - centerY) * projectionFactor;

      this.ctx.fillStyle = `rgba(${particleColor.r}, ${particleColor.g}, ${particleColor.b}, ${opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(projectedX, projectedY, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawFunnelDoors(width, height, doorProgress, tunnelPhase) {
    this.ctx.clearRect(0, 0, width, height);
    this.drawTunnel(width, height, tunnelPhase);

    const doorColor = this.getSurfaceColor();
    const borderColor = this.getDoorStrokeColor();
    const half = width / 2;

    const offset = half * doorProgress;
    const leftX = -offset;
    const rightX = half + offset;
    const doorY = -2;
    const doorHeight = height + 4;

    this.ctx.fillStyle = doorColor;
    this.ctx.fillRect(leftX, doorY, half, doorHeight);
    this.ctx.fillRect(rightX, doorY, half, doorHeight);

    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(leftX + 0.5, doorY + 0.5, half - 1, doorHeight - 1);
    this.ctx.strokeRect(rightX + 0.5, doorY + 0.5, half - 1, doorHeight - 1);
  }
}

// Download button: platform labels and URLs (replace with real URLs when available)
const DOWNLOAD_CONFIG = {
  "macos-arm64":   { label: "Mac", sub: "Apple Silicon", icon: "icon-apple", href: "#download-macos-arm64" },
  "macos-x64":     { label: "Mac", sub: "Intel",        icon: "icon-apple", href: "#download-macos-x64" },
  "windows-x64":  { label: "Windows", sub: "x64",      icon: "icon-windows", href: "#download-windows-x64" },
  "windows-arm64": { label: "Windows", sub: "ARM64",   icon: "icon-windows", href: "#download-windows-arm64" },
  "linux-x64":    { label: "Linux", sub: "x86_64",     icon: "icon-linux", href: "#download-linux-x64" },
  "linux-arm64":  { label: "Linux", sub: "ARM64",     icon: "icon-linux", href: "#download-linux-arm64" },
};

function getWebGLRenderer() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return "";
    return (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "").toLowerCase();
  } catch (_) {
    return "";
  }
}

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.userAgentData?.platform?.toLowerCase() || navigator.platform?.toLowerCase() || "";
  let arch = navigator.userAgentData?.architecture?.toLowerCase();
  if (!arch) arch = ua.includes("arm") || ua.includes("aarch64") ? "arm" : "x86";

  if (ua.includes("mac") || platform.includes("mac") || ua.includes("iphone") || ua.includes("ipad")) {
    if (arch === "arm") return "macos-arm64";
    if (arch === "x86" || platform.includes("intel")) {
      const renderer = getWebGLRenderer();
      if (renderer.includes("apple m")) return "macos-arm64";
      if (renderer.includes("intel")) return "macos-x64";
    }
    return "macos-arm64";
  }
  if (ua.includes("win") || platform.includes("win")) {
    return arch === "arm" ? "windows-arm64" : "windows-x64";
  }
  if (ua.includes("linux") || platform.includes("linux")) {
    return arch === "arm" ? "linux-arm64" : "linux-x64";
  }
  return "macos-arm64";
}

function setDownloadButton(id) {
  const cfg = DOWNLOAD_CONFIG[id];
  if (!cfg) return;
  const main = document.getElementById("download-main");
  const iconEl = main?.querySelector(".download-btn-icon");
  if (!main || !iconEl) return;
  main.href = cfg.href;
  main.setAttribute("data-platform", id);
  main.querySelector(".download-btn-text").textContent = cfg.label + (cfg.sub ? ` (${cfg.sub})` : "");
  iconEl.innerHTML = `<svg><use href="#${cfg.icon}"/></svg>`;
}

function initDownloadButton() {
  const main = document.getElementById("download-main");
  const wrap = document.querySelector(".download-dropdown-wrap");
  const trigger = document.querySelector(".download-dropdown-trigger");
  const dropdown = document.getElementById("download-dropdown");
  if (!main || !wrap || !trigger || !dropdown) return;

  const detected = detectPlatform();
  setDownloadButton(detected);

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    const open = wrap.getAttribute("aria-expanded") === "true";
    wrap.setAttribute("aria-expanded", !open);
    trigger.setAttribute("aria-expanded", !open);
    dropdown.setAttribute("aria-hidden", open);
  });

  dropdown.querySelectorAll("a").forEach((link) => {
    const id = link.getAttribute("data-id");
    if (id && DOWNLOAD_CONFIG[id]) link.href = DOWNLOAD_CONFIG[id].href;
    link.addEventListener("click", () => {
      const dataId = link.getAttribute("data-id");
      if (dataId) setDownloadButton(dataId);
      wrap.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-expanded", "false");
      dropdown.setAttribute("aria-hidden", "true");
    });
  });

  document.addEventListener("click", (e) => {
    if (wrap.getAttribute("aria-expanded") === "true" && !wrap.contains(e.target)) {
      wrap.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-expanded", "false");
      dropdown.setAttribute("aria-hidden", "true");
    }
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Initialize the chute canvas
  const canvas = document.getElementById("chute-canvas");
  if (canvas) {
    const chute = new ChuteCanvas(canvas);
    chute.start();
  }

  initDownloadButton();

  // Dark mode toggle
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  if (!darkModeToggle) return;

  const darkModeMedia = window.matchMedia("(prefers-color-scheme: dark)");
  const storedTheme = localStorage.getItem("theme");

  function setDarkMode(enabled) {
    document.body.classList.toggle("dark-mode", enabled);
    darkModeToggle.setAttribute("aria-checked", enabled);
    localStorage.setItem("theme", enabled ? "dark" : "light");
  }

  // Initialize based on stored preference or system preference
  if (storedTheme === "dark" || (storedTheme === null && darkModeMedia.matches)) {
    setDarkMode(true);
  }

  // Listen for system preference changes (only if no stored preference)
  darkModeMedia.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      setDarkMode(e.matches);
    }
  });

  darkModeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-mode");
    setDarkMode(!isDark);
  });
});
