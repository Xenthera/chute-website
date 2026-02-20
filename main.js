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

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Initialize the chute canvas
  const canvas = document.getElementById("chute-canvas");
  if (canvas) {
    const chute = new ChuteCanvas(canvas);
    chute.start();
  }

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
