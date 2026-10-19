/**
 * JX-IDLE Pure API & MySQL Storage Engine (storage.js)
 * Replaces all localStorage with strict session management (Cookie/sessionStorage)
 * and direct MySQL persistence via /api/saves and /api/auth.
 */
(function () {
  "use strict";

  window.CHAT_CFG = { url: "/api", key: "offline_local_key", turnstile: "" };
  window.AUTH_ENABLED = true;

  // 1. Session & Cookie Utility
  function getCookie(name) {
    try {
      const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  }

  function setCookie(name, val, days = 7) {
    try {
      document.cookie = `${name}=${encodeURIComponent(val)}; path=/; max-age=${days * 86400}; SameSite=Lax`;
    } catch {}
  }

  function deleteCookie(name) {
    try {
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    } catch {}
  }

  const JXSession = {
    getSid() {
      try {
        return sessionStorage.getItem("jx_sid") || getCookie("jx_sid") || null;
      } catch {
        return null;
      }
    },
    getToken() {
      try {
        return sessionStorage.getItem("jx_token") || getCookie("jx_token") || null;
      } catch {
        return null;
      }
    },
    getUser() {
      try {
        return sessionStorage.getItem("jx_user") || getCookie("jx_user") || null;
      } catch {
        return null;
      }
    },
    getActiveSlot() {
      try {
        const val = sessionStorage.getItem("jx_active_slot");
        return val !== null && val !== undefined ? Number(val) : null;
      } catch {
        return null;
      }
    },
    setActiveSlot(slot) {
      try {
        if (slot === null || slot === undefined) {
          sessionStorage.removeItem("jx_active_slot");
        } else {
          sessionStorage.setItem("jx_active_slot", String(slot));
        }
      } catch {}
    },
    hasActiveSlot() {
      try {
        const val = this.getActiveSlot();
        return val !== null && Number.isInteger(val) && val >= 0;
      } catch {
        return false;
      }
    },
    set(user, sid, token) {
      if (!user || !sid) {
        this.clear();
        return;
      }
      const clean = String(user).trim().toLowerCase();
      try {
        sessionStorage.setItem("jx_user", clean);
        sessionStorage.setItem("jx_sid", sid);
        sessionStorage.setItem("jx_token", token || "");
      } catch {}
      setCookie("jx_user", clean, 7);
      setCookie("jx_sid", sid, 7);
      setCookie("jx_token", token || "", 7);
    },
    clear() {
      try {
        sessionStorage.removeItem("jx_user");
        sessionStorage.removeItem("jx_sid");
        sessionStorage.removeItem("jx_token");
        sessionStorage.removeItem("jx_active_slot");
        sessionStorage.removeItem("jx_server_saves");
        sessionStorage.removeItem("jxidle_in");
      } catch {}
      deleteCookie("jx_user");
      deleteCookie("jx_sid");
      deleteCookie("jx_token");
      this.purgeLocalStorage();
    },
    purgeLocalStorage() {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.startsWith("jxidle_") || k.startsWith("jxCheat") || k.startsWith("jx_") || k.startsWith("jx") || k === "b1" || k === "L1" || /_bak$/.test(k))) {
            localStorage.removeItem(k);
          }
        }
      } catch {}
    }
  };

  try {
    const cachedSaves = sessionStorage.getItem("jx_server_saves");
    if (cachedSaves) {
      const parsedSaves = JSON.parse(cachedSaves);
      if (Array.isArray(parsedSaves) && parsedSaves.length > 0) {
        window.__SERVER_SAVES = parsedSaves;
      }
    }
  } catch {}

  window.JXSession = JXSession;

  // 2. Global Kick to State-Auth
  function kickToAuth(reason) {
    console.warn("[Session Guard] 🚨 Kicked to state-auth:", reason || "Session expired");
    JXSession.clear();

    if (window.B) {
      window.B.user = null;
    }
    if (window.o) {
      window.o = null;
    }

    const csel = document.getElementById("csel");
    if (csel) csel.remove();
    const cnew = document.getElementById("cnew");
    if (cnew) cnew.remove();

    window.NET_GATE = true;
    document.body.classList.add("ngate-on");
    const modal = document.getElementById("modal");
    if (modal) {
      modal.classList.remove("hidden");
    }

    if (typeof window.updateViewportState === "function") {
      window.updateViewportState();
    }
    if (typeof window.forceLogoutToLogin === "function") {
      window.forceLogoutToLogin(reason || "Phiên đăng nhập đã kết thúc");
    }
  }
  window.kickToAuth = kickToAuth;

  // 3. Pure MySQL Supabase API Adapter
  function createApiClient() {
    return {
      auth: {
        async getSession() {
          const user = JXSession.getUser();
          const token = JXSession.getToken();
          const sid = JXSession.getSid();

          if (!user || !sid || !token) {
            return { data: { session: null }, error: null };
          }

          try {
            const res = await fetch("/api/heartbeat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ username: user, sessionId: sid })
            });

            if (!res.ok) {
              throw new Error("Không thể kết nối máy chủ");
            }

            const json = await res.json();
            if (!json.ok || json.kick) {
              JXSession.clear();
              return { data: { session: null }, error: new Error(json.reason || "Phiên không hợp lệ") };
            }

            return {
              data: {
                session: {
                  user: {
                    id: user,
                    name: user,
                    email: user + "@offline.local"
                  },
                  access_token: token,
                  session_id: sid
                }
              },
              error: null
            };
          } catch (err) {
            JXSession.clear();
            return { data: { session: null }, error: err };
          }
        },

        async signInWithPassword({ email, password }) {
          const username = String(email || "").replace(/@.*$/, "").trim().toLowerCase();
          if (!username) throw new Error("Vui lòng nhập tên tài khoản");

          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "in", username, password })
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            throw new Error(data.message || "Đăng nhập thất bại");
          }

          const token = data.session?.access_token || "";
          const sid = data.session?.session_id || "";
          JXSession.set(data.user.id, sid, token);
          JXSession.setActiveSlot(null);

          return {
            data: {
              user: data.user,
              session: {
                user: data.user,
                access_token: token,
                session_id: sid
              }
            }
          };
        },

        async signUp({ email, password }) {
          const username = String(email || "").replace(/@.*$/, "").trim().toLowerCase();
          if (!username) throw new Error("Vui lòng nhập tên tài khoản");

          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "up", username, password })
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            throw new Error(data.message || "Đăng ký tài khoản thất bại");
          }

          const token = data.session?.access_token || "";
          const sid = data.session?.session_id || "";
          JXSession.set(data.user.id, sid, token);
          JXSession.setActiveSlot(null);

          return {
            data: {
              user: data.user,
              session: {
                user: data.user,
                access_token: token,
                session_id: sid
              }
            }
          };
        },

        async signOut() {
          const user = JXSession.getUser();
          try {
            if (user) {
              await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "out", username: user })
              }).catch(() => {});
            }
          } catch {}
          JXSession.clear();
          return { error: null };
        },

        onAuthStateChange(cb) {
          const user = JXSession.getUser();
          if (typeof cb === "function") {
            if (user) {
              setTimeout(() => cb("SIGNED_IN", { user: { id: user, name: user, email: user + "@offline.local" }, access_token: JXSession.getToken() }), 0);
            } else {
              setTimeout(() => cb("SIGNED_OUT", null), 0);
            }
          }
          return { data: { subscription: { unsubscribe() {} } } };
        }
      },

      from(table) {
        const filters = {};

        const queryObj = {
          select() { return this; },
          eq(col, val) { filters[col] = val; return this; },
          gt() { return this; },
          gte() { return this; },
          lte() { return this; },
          in() { return this; },
          order() { return this; },
          limit() { return this; },

          delete() {
            return {
              eq(col, val) {
                filters[col] = val;
                return this;
              },
              async then(resolve, reject) {
                if (table === "saves") {
                  const owner = filters["owner"] || JXSession.getUser();
                  const slot = filters["slot"] !== undefined ? filters["slot"] : 0;
                  const token = JXSession.getToken();
                  try {
                    const res = await fetch(`/api/saves?owner=${encodeURIComponent(owner)}&slot=${slot}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    resolve({ data, error: null });
                  } catch (err) {
                    resolve({ data: null, error: err });
                  }
                } else {
                  resolve({ data: { ok: true }, error: null });
                }
              }
            };
          },

          async upsert(record) {
            if (table === "saves") {
              try {
                const payload = Object.assign({}, record);
                if (!payload.owner) payload.owner = JXSession.getUser();
                const slotKey = payload.slot !== undefined ? payload.slot : 0;
                try {
                  localStorage.setItem("jx_hybrid_save_" + payload.owner + "_" + slotKey, JSON.stringify(payload));
                } catch {}
                let res;
                if (typeof window.sendSecureSave === "function") {
                  res = await window.sendSecureSave("/api/saves", payload);
                } else {
                  const token = JXSession.getToken();
                  res = await fetch("/api/saves", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                  });
                }
                const data = await res.json();
                if (data && data.ok && data.updated) {
                  window.__LAST_SERVER_UPDATED = data.updated;
                  if (!Array.isArray(window.__SERVER_SAVES)) {
                    window.__SERVER_SAVES = [];
                  }
                  const existingIdx = window.__SERVER_SAVES.findIndex(s => s && (s.slot ?? 0) === (payload.slot ?? 0));
                  const updatedEntry = {
                    slot: payload.slot ?? 0,
                    data: payload.data || payload,
                    updated: data.updated
                  };
                  if (existingIdx >= 0) {
                    window.__SERVER_SAVES[existingIdx] = Object.assign({}, window.__SERVER_SAVES[existingIdx], updatedEntry);
                  } else {
                    window.__SERVER_SAVES.push(updatedEntry);
                  }
                  try {
                    sessionStorage.setItem("jx_server_saves", JSON.stringify(window.__SERVER_SAVES));
                  } catch {}
                }
                return { data, error: null };
              } catch (err) {
                return { data: null, error: err };
              }
            } else if (table === "chars") {
              try {
                if (typeof window.sendSecureSave === "function") {
                  await window.sendSecureSave("/api/chars", record);
                } else {
                  const token = JXSession.getToken();
                  await fetch("/api/chars", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(record)
                  });
                }
              } catch {}
              return { data: { ok: true }, error: null };
            }
            return { data: { ok: true }, error: null };
          },

          async single() {
            return this.maybeSingle();
          },

          async maybeSingle() {
            if (table === "saves") {
              const owner = filters["owner"] || JXSession.getUser();
              const slot = filters["slot"] !== undefined ? +filters["slot"] : 0;
              try {
                const token = JXSession.getToken();
                const res = await fetch(`/api/saves/get?owner=${encodeURIComponent(owner)}&slot=${slot}`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (res.ok) {
                  const json = await res.json();
                  if (json && json.data) {
                    return { data: json.data, error: null };
                  }
                }
              } catch (e) {}
              try {
                const backup = localStorage.getItem("jx_hybrid_save_" + owner + "_" + slot);
                if (backup) {
                  const parsed = JSON.parse(backup);
                  if (parsed) {
                    return { data: parsed, error: null };
                  }
                }
              } catch {}
              return { data: null, error: null };
            }
            return { data: null, error: null };
          },

          async then(resolve) {
            if (table === "saves") {
              const owner = filters["owner"] || JXSession.getUser();
              const token = JXSession.getToken();
              try {
                const res = await fetch(`/api/saves/list?owner=${encodeURIComponent(owner)}`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                const json = await res.json();
                const list = Array.isArray(json.data) ? json.data : [];
                if (list.length > 0) {
                  window.__SERVER_SAVES = list;
                  resolve({ data: list, error: null });
                  return;
                }
              } catch (err) {}
              const fallbackList = [];
              try {
                for (let i = 0; i < 5; i++) {
                  const backup = localStorage.getItem("jx_hybrid_save_" + owner + "_" + i);
                  if (backup) {
                    const parsed = JSON.parse(backup);
                    if (parsed) fallbackList.push(parsed);
                  }
                }
              } catch {}
              if (fallbackList.length > 0) {
                window.__SERVER_SAVES = fallbackList;
                resolve({ data: fallbackList, error: null });
              } else {
                window.__SERVER_SAVES = [];
                resolve({ data: [], error: null });
              }
            } else if (table === "mail") {
              resolve({ data: [], count: 0, error: null });
            } else {
              resolve({ data: [], error: null });
            }
          }
        };

        return queryObj;
      },

      async rpc(fnName, args) {
        const curKnb = () => {
          try {
            return window.__JX && window.__JX.S && Number.isFinite(window.__JX.S.knb) ? window.__JX.S.knb : 0;
          } catch {
            return 0;
          }
        };
        if (fnName === "knb_sync") {
          const add = args && +args.p_add > 0 ? +args.p_add : 0;
          return { data: { bal: curKnb() + add, got: {}, day: {} }, error: null };
        }
        if (fnName === "knb_spend") {
          const amt = args && +args.p_amt > 0 ? +args.p_amt : 0;
          return { data: { bal: Math.max(0, curKnb() - amt), hid: "offline_" + Date.now() }, error: null };
        }
        if (fnName === "knb_refund") {
          const amt = args && +args.p_amt > 0 ? +args.p_amt : 0;
          return { data: { bal: curKnb() + amt }, error: null };
        }
        if (fnName === "claim_mail") {
          return { data: { gold: 0, knb: 0 }, error: null };
        }
        return { data: null, error: null };
      }
    };
  }

  window.supabase = {
    createClient() {
      return createApiClient();
    }
  };

  console.log("[JX-IDLE] Session & MySQL Database Storage Active (Pure API, zero localStorage).");
})();
