// JX-IDLE H5 Egret MovieClip Animation Engine (PNG/WebP + JSON/JS)
(function () {
  "use strict";

  const imgCache = new Map();
  const metaCache = new Map();
  const loadingPromises = new Map();

  // 8-direction Isometric Map (0..7) -> Egret Direction (1..5) & Horizontal Flip
  // JX Dir: 0=S, 1=SW, 2=W, 3=NW, 4=N, 5=NE, 6=E, 7=SE
  const DIR_MAP = {
    0: { dir: 1, flip: false },
    1: { dir: 1, flip: true },
    2: { dir: 2, flip: true },
    3: { dir: 3, flip: true },
    4: { dir: 4, flip: false },
    5: { dir: 3, flip: false },
    6: { dir: 2, flip: false },
    7: { dir: 1, flip: false }
  };

  // Action name alias resolution
  const ACTION_ALIASES = {
    st: ["st", "stand", "idle", "FreeStand3"],
    run: ["wlk", "run", "walk", "FreeRun"],
    wlk: ["wlk", "run", "walk"],
    at: ["at01", "at", "at02", "at03", "at04", "attack", "FreeAttack"],
    at01: ["at01", "at", "attack"],
    hurt: ["bat", "hurt", "hit", "st"],
    die: ["die", "death"]
  };

  const ONE_SHOT_ACTIONS = new Set(["at", "at01", "at02", "at03", "at04", "die", "death", "hurt", "bat"]);

  function getImg(url) {
    if (!url) return null;
    let img = imgCache.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      imgCache.set(url, img);
    }
    return img;
  }

  function loadMetadata(url) {
    if (!url) return Promise.resolve(null);
    if (metaCache.has(url)) return Promise.resolve(metaCache.get(url));
    if (loadingPromises.has(url)) return loadingPromises.get(url);

    const p = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
        return res.text();
      })
      .then((text) => {
        let data = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          const start = text.indexOf("{");
          const end = text.lastIndexOf("}");
          if (start !== -1 && end !== -1 && end > start) {
            try {
              data = JSON.parse(text.slice(start, end + 1));
            } catch (e2) {
              try {
                data = new Function("return " + text.slice(start, end + 1))();
              } catch (e3) {
                console.warn("[H5Anim] Failed parsing metadata:", url, e3);
              }
            }
          }
        }
        if (data) metaCache.set(url, data);
        loadingPromises.delete(url);
        return data;
      })
      .catch((err) => {
        console.warn("[H5Anim] Failed to load metadata:", url, err);
        loadingPromises.delete(url);
        return null;
      });

    loadingPromises.set(url, p);
    return p;
  }

  const actors = new Map();

  function registerActor(id, config) {
    const basePath = (config.path || config.basePath || "").replace(/\/?$/, "/");
    const actions = config.actions || {};
    const scale = config.scale || 1.0;

    actors.set(id, {
      id,
      name: config.name || id,
      basePath,
      scale,
      actions
    });

    if (config.preload !== false) {
      preloadActor(id);
    }
  }

  function registerFromFiles(id, basePath, fileList, options = {}) {
    const dirMap = {};
    const bPath = (basePath || "").replace(/\/?$/, "/");

    for (const f of fileList) {
      const m = f.match(/^([a-zA-Z0-9]+)_(\d+)_/);
      if (!m) continue;
      const actKey = m[1].toLowerCase();
      const dirNum = parseInt(m[2], 10);
      dirMap[actKey] = dirMap[actKey] || {};
      dirMap[actKey][dirNum] = dirMap[actKey][dirNum] || {};

      if (f.endsWith(".json") || f.endsWith(".js")) {
        dirMap[actKey][dirNum].meta = f;
      } else if (f.endsWith(".png") || f.endsWith(".webp") || f.endsWith(".jpg")) {
        dirMap[actKey][dirNum].img = f;
      }
    }

    registerActor(id, {
      id,
      name: options.name || id,
      basePath: bPath,
      scale: options.scale || 1.0,
      actions: dirMap
    });
  }

  function resolveActionDir(actor, actReq, dir8) {
    const actions = actor.actions;
    const aliases = ACTION_ALIASES[actReq] || [actReq];

    let matchedActKey = null;
    for (const a of aliases) {
      if (actions[a]) {
        matchedActKey = a;
        break;
      }
    }
    if (!matchedActKey) {
      matchedActKey = Object.keys(actions)[0];
    }
    if (!matchedActKey || !actions[matchedActKey]) return null;

    const actDirs = actions[matchedActKey];
    const mapping = DIR_MAP[dir8 % 8] || { dir: 1, flip: false };
    const targetDir = mapping.dir;
    const flip = mapping.flip;

    if (actDirs[targetDir]) {
      return {
        actKey: matchedActKey,
        dirNum: targetDir,
        entry: actDirs[targetDir],
        flip
      };
    }

    const avail = Object.keys(actDirs).map((k) => parseInt(k, 10)).filter((n) => !isNaN(n));
    if (!avail.length) return null;

    let closest = avail[0];
    let minDiff = Math.abs(closest - targetDir);
    for (let i = 1; i < avail.length; i++) {
      const d = avail[i];
      const diff = Math.abs(d - targetDir);
      if (diff < minDiff) {
        minDiff = diff;
        closest = d;
      }
    }

    return {
      actKey: matchedActKey,
      dirNum: closest,
      entry: actDirs[closest],
      flip
    };
  }

  function preloadActor(actorId) {
    const act = actors.get(actorId);
    if (!act) return;
    for (const aKey of Object.keys(act.actions)) {
      const dirs = act.actions[aKey];
      for (const dKey of Object.keys(dirs)) {
        const item = dirs[dKey];
        if (item.meta) loadMetadata(act.basePath + item.meta);
        if (item.img) getImg(act.basePath + item.img);
      }
    }
  }

  function getDuration(actorId, action) {
    const act = actors.get(actorId);
    if (!act) return 0;
    const resolved = resolveActionDir(act, action, 0);
    if (!resolved || !resolved.entry || !resolved.entry.meta) return 0;
    const metaUrl = act.basePath + resolved.entry.meta;
    const metaData = metaCache.get(metaUrl);
    if (!metaData || !metaData.mc) return 0;
    const mcDef = Object.values(metaData.mc)[0];
    if (!mcDef || !mcDef.frames || !mcDef.frames.length) return 0;
    const fps = mcDef.frameRate || 12;
    return mcDef.frames.length / fps;
  }

  function draw(ctx, actorId, action, dir, actT, x, y, scale = 1, alpha = 1) {
    const actor = actors.get(actorId);
    if (!actor) return 0;

    const resolved = resolveActionDir(actor, action, dir);
    if (!resolved || !resolved.entry) return 0;

    const metaUrl = actor.basePath + (resolved.entry.meta || resolved.entry.json);
    const imgUrl = actor.basePath + (resolved.entry.img || resolved.entry.png);

    const metaData = metaCache.get(metaUrl);
    if (!metaData) {
      loadMetadata(metaUrl);
      getImg(imgUrl);
      return 0;
    }

    const img = getImg(imgUrl);
    if (!img || !img.complete || !img.naturalWidth) {
      return 0;
    }

    const mcDef = Object.values(metaData.mc)[0];
    if (!mcDef || !mcDef.frames || !mcDef.frames.length) return 0;

    const frames = mcDef.frames;
    const frameRate = mcDef.frameRate || 12;
    const isOneShot = ONE_SHOT_ACTIONS.has(resolved.actKey) || ONE_SHOT_ACTIONS.has(action);

    let frameIdx = 0;
    if (isOneShot) {
      frameIdx = Math.min(Math.floor((actT || 0) * frameRate), frames.length - 1);
    } else {
      frameIdx = Math.floor((actT || 0) * frameRate) % frames.length;
    }
    if (frameIdx < 0) frameIdx = 0;

    const curFrame = frames[frameIdx];
    if (!curFrame) return 0;

    const resRect = metaData.res && metaData.res[curFrame.res];
    if (!resRect) return 0;

    const effScale = (scale || 1.0) * (actor.scale || 1.0);
    const sw = resRect.w;
    const sh = resRect.h;
    const dw = Math.round(sw * effScale);
    const dh = Math.round(sh * effScale);

    const ox = curFrame.x !== undefined ? curFrame.x : (curFrame.ax !== undefined ? curFrame.ax : 0);
    const oy = curFrame.y !== undefined ? curFrame.y : (curFrame.ay !== undefined ? curFrame.ay : 0);

    // Ground Shadow
    if (alpha >= 0.4 && action !== "die" && resolved.actKey !== "die") {
      ctx.save();
      ctx.globalAlpha = 0.22 * alpha;
      ctx.fillStyle = "#080c08";
      ctx.translate(x, y - 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.min(30, sw * 0.35) * effScale, Math.min(10, sh * 0.12) * effScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Frame with dynamic slice & anchor offset
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (resolved.flip) {
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.drawImage(
        img,
        resRect.x,
        resRect.y,
        sw,
        sh,
        Math.round(ox * effScale),
        Math.round(oy * effScale),
        dw,
        dh
      );
    } else {
      ctx.drawImage(
        img,
        resRect.x,
        resRect.y,
        sw,
        sh,
        Math.round(x + ox * effScale),
        Math.round(y + oy * effScale),
        dw,
        dh
      );
    }

    ctx.restore();
    return dh;
  }

  // Register built-in default NPC09 model
  const NPC09_FILES = [
    "at01_1_13251000.json", "at01_1_663da91c.png",
    "at01_2_216f4e29.json", "at01_2_94bb6290.png",
    "at01_3_c0db9681.png",  "at01_3_d77b685f.json",
    "at01_4_24bd1790.png",  "at01_4_82334224.json",
    "die_2_64b7eb3c.json",  "die_2_a533aa6e.png",
    "st_1_a24f385b.json",   "st_1_d3e7989a.png",
    "st_2_4fcf03c3.png",    "st_2_84dd892.json",
    "st_4_6c126ce.json",    "st_4_964341d8.png",
    "wlk_1_2625bbcc.png",   "wlk_1_9ab3c776.json",
    "wlk_2_1e5f286d.png",   "wlk_2_970bca00.json",
    "wlk_3_20841997.png",   "wlk_3_42fc0df8.json"
  ];

  registerFromFiles("npc09", "res/models/h5/npc09/", NPC09_FILES, {
    name: "VLTK-H5 Kiếm Khách (npc09)",
    scale: 1.05
  });

  // Hero Skin Helpers
  function applyHeroSkin(actorId) {
    if (!actors.has(actorId)) {
      console.warn("[H5Anim] Unknown actorId:", actorId);
      return false;
    }
    if (window.o) window.o.h5Skin = actorId;
    if (window.r && window.r.look) window.r.look.h5Skin = actorId;
    return true;
  }

  function clearHeroSkin() {
    if (window.o) delete window.o.h5Skin;
    if (window.r && window.r.look) delete window.r.look.h5Skin;
  }

  // Monster / NPC Auto-Register Helper
  function registerMonster(actorId, options = {}) {
    if (!window.JW) window.JW = {};
    if (!window.JW.mon) window.JW.mon = {};

    window.JW.mon[actorId] = {
      n: options.name || "H5 NPC (" + actorId + ")",
      img: options.img || ("res/models/h5/" + actorId + "/st_1_d3e7989a.png"),
      sz: options.sz || [35, 105, 18, 105],
      ranged: options.ranged || 0,
      sk: options.sk || [53, 53, 53, 53],
      spd: options.spd || 18,
      run: options.run || 7,
      rmax: [75, 90, 75, 60, 75],
      anim: actorId,
      tr: 1,
      hr: options.hr || 50,
      vis: 400,
      lr: [0, 0.05],
      cls: options.cls || "normal"
    };
  }

  registerMonster("npc09", {
    name: "H5 Kiếm Khách",
    cls: "boss"
  });

  window.H5Anim = {
    actors,
    registerActor,
    registerFromFiles,
    hasActor: (id) => actors.has(id),
    preloadActor,
    getDuration,
    draw,
    applyHeroSkin,
    clearHeroSkin,
    registerMonster
  };
})();
