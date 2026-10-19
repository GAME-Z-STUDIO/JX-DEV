/**
 * JX-IDLE 16:9 Fixed Virtual Viewport (1920x1080) Auto-Scaler & Screen Layer Manager
 * Preserves exact 16:9 aspect ratio, centers viewport dynamically without orientation lock,
 * and anchors all UI/logo/badge elements inside the virtual canvas.
 */
(function () {
  "use strict";

  const TARGET_WIDTH = 1920;
  const TARGET_HEIGHT = 1080;

  function updateViewportState() {
    const vp = document.getElementById("game-viewport") || document.getElementById("game-container");
    const app = document.getElementById("game-app");
    if (!vp) return;

    const hasCharUI = !!(document.getElementById("csel") || document.getElementById("cnew"));
    const hasUser = !!(window.B && window.B.user) || !!(window.JXSession && typeof window.JXSession.getUser === "function" && window.JXSession.getUser());
    const hasActiveSlot = !!(window.JXSession && typeof window.JXSession.hasActiveSlot === "function" && window.JXSession.hasActiveSlot());
    const isAuth = !hasUser || !!window.NET_GATE || document.body.classList.contains("ngate-on");
    const isChar = !isAuth && (hasCharUI || !hasActiveSlot || !window.o || !window.o.fac);
    const isGame = !isAuth && !isChar && hasActiveSlot && !!(window.o && window.o.fac);

    if (vp.classList.contains("state-auth") !== isAuth) vp.classList.toggle("state-auth", isAuth);
    if (vp.classList.contains("state-char") !== isChar) vp.classList.toggle("state-char", isChar);
    if (vp.classList.contains("state-game") !== isGame) vp.classList.toggle("state-game", isGame);

    if (app) {
      if (app.classList.contains("state-auth") !== isAuth) app.classList.toggle("state-auth", isAuth);
      if (app.classList.contains("state-char") !== isChar) app.classList.toggle("state-char", isChar);
      if (app.classList.contains("state-game") !== isGame) app.classList.toggle("state-game", isGame);
    }

    if (document.body.classList.contains("state-auth") !== isAuth) document.body.classList.toggle("state-auth", isAuth);
    if (document.body.classList.contains("state-char") !== isChar) document.body.classList.toggle("state-char", isChar);
    if (document.body.classList.contains("state-game") !== isGame) document.body.classList.toggle("state-game", isGame);

    const modal = document.getElementById("modal");
    if (isAuth) {
      if (!document.body.classList.contains("ngate-on")) {
        document.body.classList.add("ngate-on");
      }
      if (modal && modal.classList.contains("hidden") && document.querySelector(".ng2")) {
        modal.classList.remove("hidden");
      }
    } else {
      if (document.body.classList.contains("ngate-on")) {
        document.body.classList.remove("ngate-on");
      }
      if (modal && document.querySelector(".ng2") && !modal.classList.contains("hidden")) {
        modal.classList.add("hidden");
      }
    }
  }

  function adoptElements() {
    const uiLayer = document.getElementById("game-ui-layer");
    const charScreen = document.getElementById("char-select-screen");
    const authScreen = document.getElementById("auth-screen");
    const viewport = document.getElementById("game-viewport") || document.getElementById("game-container");
    if (!viewport) return;

    // 1. Move character selection / creation into #char-select-screen
    const cnew = document.getElementById("cnew");
    const csel = document.getElementById("csel");
    if (charScreen) {
      if (cnew && cnew.parentNode !== charScreen) charScreen.appendChild(cnew);
      if (csel && csel.parentNode !== charScreen) charScreen.appendChild(csel);
    } else {
      if (cnew && cnew.parentNode === document.body) viewport.appendChild(cnew);
      if (csel && csel.parentNode === document.body) viewport.appendChild(csel);
    }

    // 2. Keep 18+ badge and logo strictly inside #auth-screen (nested in #game-viewport)
    const targetAuth = authScreen || viewport;
    const corner = document.getElementById("cornerIdentify");
    const logo = document.getElementById("landingLogoText");
    if (corner && corner.parentNode !== targetAuth) targetAuth.appendChild(corner);
    if (logo && logo.parentNode !== targetAuth) targetAuth.appendChild(logo);

    // 3. Move modal into #game-viewport if detached
    const modal = document.getElementById("modal");
    if (modal && modal.parentNode !== viewport && modal.parentNode === document.body) {
      viewport.appendChild(modal);
    }

    // 4. Move in-game UI controls into #game-ui-layer
    const targetLayer = uiLayer || viewport;
    const uiIds = [
      "u20menu", "u20rc", "u20zone", "u20side", "u20r", "u20gold",
      "u20log", "u20boss", "u20rank", "chatBox", "u2bagw", "u2charw",
      "u2chw", "u2kbw", "ptBox", "ptInv", "u2tip", "jxhome", "maint"
    ];
    for (const id of uiIds) {
      const el = document.getElementById(id);
      if (el && el.parentNode !== targetLayer && el.parentNode === document.body) {
        targetLayer.appendChild(el);
      }
    }
  }

  function resizeGame() {
    const windowWidth = window.innerWidth || document.documentElement.clientWidth || TARGET_WIDTH;
    const windowHeight = window.innerHeight || document.documentElement.clientHeight || TARGET_HEIGHT;

    // Remove orientation warning: let viewport scale down automatically to fit any window size
    const orientEl = document.getElementById("orientation-warning");
    if (orientEl) {
      orientEl.classList.remove("active");
      orientEl.style.display = "none";
    }

    const scale = Math.min(windowWidth / TARGET_WIDTH, windowHeight / TARGET_HEIGHT);

    window.__STAGE_SCALE = scale;
    window.__STAGE_W = TARGET_WIDTH;
    window.__STAGE_H = TARGET_HEIGHT;

    const root = document.documentElement;
    root.style.setProperty('--stage-w', TARGET_WIDTH + 'px');
    root.style.setProperty('--stage-h', TARGET_HEIGHT + 'px');
    root.style.setProperty('--stage-scale', scale.toFixed(5));
    root.style.setProperty('--app-h', TARGET_HEIGHT + 'px');

    const viewport = document.getElementById("game-viewport") || document.getElementById("game-container");
    if (viewport) {
      viewport.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }

    adoptElements();
    updateViewportState();

    if (typeof window.I3 === "function") {
      window.I3();
    }
  }

  window.addEventListener("resize", resizeGame);
  window.addEventListener("orientationchange", () => {
    setTimeout(resizeGame, 80);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", resizeGame);
  } else {
    resizeGame();
  }

  // Safe MutationObserver with rAF throttling and disconnect guard
  let isUpdating = false;
  let updateScheduled = false;

  function safeUpdate() {
    if (isUpdating) return;
    isUpdating = true;
    try {
      if (bodyObserver) bodyObserver.disconnect();
      adoptElements();
      updateViewportState();
    } finally {
      isUpdating = false;
      startObserver();
    }
  }

  function scheduleUpdate() {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(() => {
      updateScheduled = false;
      safeUpdate();
    });
  }

  const bodyObserver = new MutationObserver(() => {
    scheduleUpdate();
  });

  function startObserver() {
    if (document.body && !isUpdating) {
      bodyObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      safeUpdate();
    });
  } else {
    safeUpdate();
  }

  window.resizeGame = resizeGame;
  window.adoptElements = adoptElements;
  window.updateViewportState = updateViewportState;
  if (!window.kickToAuth) {
    window.kickToAuth = function (reason) {
      if (window.JXSession && typeof window.JXSession.clear === "function") {
        window.JXSession.clear();
      }
      const csel = document.getElementById("csel");
      if (csel) csel.remove();
      const cnew = document.getElementById("cnew");
      if (cnew) cnew.remove();
      window.NET_GATE = true;
      document.body.classList.add("ngate-on");
      updateViewportState();
      window.location.href = window.location.origin + window.location.pathname;
    };
  }
})();
