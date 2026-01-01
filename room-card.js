/* room-card.js */
/* Room Card (single-file) — room style like button-card "card_room" */

const CARD_TYPE = "room-card";
const CARD_TAG = "room-card";
const EDITOR_TAG = "room-card-editor";

/* ===================== */
/* ===== Helpers ======= */
/* ===================== */

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEntities(config) {
  if (Array.isArray(config.entities) && config.entities.length) return config.entities;
  if (typeof config.entity === "string" && config.entity.trim()) return [config.entity.trim()];
  return [];
}

function prettyName(stateObj, entityId) {
  return stateObj?.attributes?.friendly_name || entityId;
}

function isUnavailable(st) {
  const s = String(st?.state ?? "").toLowerCase();
  return s === "unavailable" || s === "unknown";
}

function isOn(st) {
  const s = String(st?.state ?? "").toLowerCase();
  return ["on", "true", "open", "opened", "home", "detected", "playing"].includes(s);
}

function pickIcon(st, fallback) {
  return st?.attributes?.icon || fallback || "mdi:home";
}

// Tries to mimic your button-card variables/state style
function widgetBgForState(st, w, defaults) {
  const base = w?.bg ?? defaults.widget_bg ?? "rgba(0,0,0,0.08)";
  if (!st) return base;

  if (isUnavailable(st)) return w?.bg_unavailable ?? w?.bg_off ?? base;
  if (isOn(st)) return w?.bg_on ?? base;
  return w?.bg_off ?? base;
}

function widgetIconForState(st, w) {
  const icon = w?.icon || "mdi:help-circle-outline";
  if (!st) return icon;

  if (isUnavailable(st))
    return w?.icon_unavailable || w?.icon_off || w?.icon_on || icon;

  if (isOn(st)) return w?.icon_on || icon;
  return w?.icon_off || w?.icon_on || icon;
}

function roomIconForState(st, cfg) {
  const icon = cfg?.icon || "mdi:home-variant";
  if (!st) return icon;

  if (isUnavailable(st)) return cfg?.icon_unavailable || icon;
  if (isOn(st)) return cfg?.icon_on || icon;
  return cfg?.icon_off || icon;
}

/* ===================== */
/* ====== EDITOR ======= */
/* ===================== */

class RoomCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
  }

  set hass(hass) {
    this._hass = hass;
  }

  setConfig(config) {
    // Backward compatible:
    // - Old: entities: [..]
    // - New: room_entity + widgets
    const entities = normalizeEntities(config);
    const room_entity = config.room_entity || entities[0] || "";
    const widgets = Array.isArray(config.widgets)
      ? config.widgets
      : (entities.slice(1, 5).map((e) => ({ entity: e })) || []);

    this._config = {
      type: "custom:room-card",
      title: config.title ?? "Room",
      room_entity,
      widgets,
      accent: config.accent ?? null,
      bg: config.bg ?? null,
      icon_bg: config.icon_bg ?? null,
      widget_bg: config.widget_bg ?? null,
      ripple_opacity: config.ripple_opacity ?? 0.3,

      // optional room icons by state
      icon: config.icon ?? null,
      icon_on: config.icon_on ?? null,
      icon_off: config.icon_off ?? null,
      icon_unavailable: config.icon_unavailable ?? null,
    };
    this._render();
  }

  _emit() {
    const out = {
      type: "custom:room-card",
      title: this._config.title,
      room_entity: this._config.room_entity,
      widgets: this._config.widgets,
      accent: this._config.accent,
      bg: this._config.bg,
      icon_bg: this._config.icon_bg,
      widget_bg: this._config.widget_bg,
      ripple_opacity: this._config.ripple_opacity,
      icon: this._config.icon,
      icon_on: this._config.icon_on,
      icon_off: this._config.icon_off,
      icon_unavailable: this._config.icon_unavailable,
    };

    // remove nulls for clean YAML
    Object.keys(out).forEach((k) => (out[k] == null || out[k] === "" ? delete out[k] : 0));

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: out },
      })
    );
  }

  _render() {
    if (!this._config || !this.shadowRoot) return;
    const c = this._config;

    this.shadowRoot.innerHTML = `
      <div class="wrap">
        <label>Title
          <input value="${esc(c.title)}" id="title">
        </label>

        <label>Room entity (optional)
          <input value="${esc(c.room_entity)}" id="room_entity" placeholder="light.kitchen or sensor...">
        </label>

        <label>Widgets (one entity per line, max 4)
          <textarea id="widgets" rows="6">${esc((c.widgets || []).map(w => w.entity).filter(Boolean).join("\n"))}</textarea>
        </label>

        <div class="grid">
          <label>bg
            <input value="${esc(c.bg ?? "")}" id="bg" placeholder="#FFE7C6 or rgba(...)">
          </label>
          <label>accent
            <input value="${esc(c.accent ?? "")}" id="accent" placeholder="#7E4400">
          </label>
          <label>icon_bg
            <input value="${esc(c.icon_bg ?? "")}" id="icon_bg" placeholder="#EEC690">
          </label>
          <label>widget_bg
            <input value="${esc(c.widget_bg ?? "")}" id="widget_bg" placeholder="rgba(0,0,0,0.08)">
          </label>
        </div>

        <label>Ripple opacity
          <input type="number" min="0" max="1" step="0.05" value="${esc(c.ripple_opacity ?? 0.3)}" id="ripple_opacity">
        </label>
      </div>

      <style>
        .wrap { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        textarea, input { width: 100%; box-sizing: border-box; }
        textarea { resize: vertical; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      </style>
    `;

    const titleEl = this.shadowRoot.querySelector("#title");
    const roomEntityEl = this.shadowRoot.querySelector("#room_entity");
    const widgetsEl = this.shadowRoot.querySelector("#widgets");
    const bgEl = this.shadowRoot.querySelector("#bg");
    const accentEl = this.shadowRoot.querySelector("#accent");
    const iconBgEl = this.shadowRoot.querySelector("#icon_bg");
    const widgetBgEl = this.shadowRoot.querySelector("#widget_bg");
    const rippleEl = this.shadowRoot.querySelector("#ripple_opacity");

    const apply = () => {
      this._config.title = titleEl.value;
      this._config.room_entity = roomEntityEl.value.trim();

      const widgetEntities = widgetsEl.value
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean)
        .slice(0, 4);

      // keep extra widget properties if they existed; otherwise make simple widgets
      const old = Array.isArray(this._config.widgets) ? this._config.widgets : [];
      this._config.widgets = widgetEntities.map((ent, i) => {
        const prev = old[i] || {};
        return { ...prev, entity: ent };
      });

      const norm = (v) => (String(v || "").trim() ? String(v).trim() : null);
      this._config.bg = norm(bgEl.value);
      this._config.accent = norm(accentEl.value);
      this._config.icon_bg = norm(iconBgEl.value);
      this._config.widget_bg = norm(widgetBgEl.value);

      const ro = parseFloat(rippleEl.value);
      this._config.ripple_opacity = Number.isFinite(ro) ? ro : 0.3;

      this._emit();
    };

    titleEl.addEventListener("input", apply);
    roomEntityEl.addEventListener("input", apply);
    widgetsEl.addEventListener("input", apply);
    bgEl.addEventListener("input", apply);
    accentEl.addEventListener("input", apply);
    iconBgEl.addEventListener("input", apply);
    widgetBgEl.addEventListener("input", apply);
    rippleEl.addEventListener("input", apply);
  }
}

if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, RoomCardEditor);
}

/* ===================== */
/* ====== CARD ========= */
/* ===================== */

class RoomCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
  }

  setConfig(config) {
    if (!config) throw new Error("Empty config");

    // Backward compatible input:
    // Old config.entities: [room, w1, w2, w3, w4]
    const entities = normalizeEntities(config);
    const room_entity = config.room_entity || entities[0] || null;

    const widgets = Array.isArray(config.widgets)
      ? config.widgets.slice(0, 4)
      : entities.slice(1, 5).map((e) => ({ entity: e }));

    this._config = {
      type: "custom:room-card",
      title: config.title ?? "Room",
      room_entity,
      widgets,

      // styling like your YAML vars
      bg: config.bg ?? "var(--ha-card-background, var(--card-background-color, #fff))",
      accent: config.accent ?? "var(--primary-text-color)",
      icon_bg: config.icon_bg ?? "rgba(0,0,0,0.08)",
      widget_bg: config.widget_bg ?? "rgba(0,0,0,0.08)",
      ripple_opacity: config.ripple_opacity ?? 0.3,

      // optional room icons by state
      icon: config.icon ?? null,
      icon_on: config.icon_on ?? null,
      icon_off: config.icon_off ?? null,
      icon_unavailable: config.icon_unavailable ?? null,
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 1;
  }

  _fireMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      })
    );
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const cfg = this._config;
    const hass = this._hass;

    const roomSt = cfg.room_entity ? hass?.states?.[cfg.room_entity] : null;

    const roomIcon = roomIconForState(roomSt, cfg);
    const roomName = cfg.title || (cfg.room_entity ? prettyName(roomSt, cfg.room_entity) : "Room");

    const widgets = (cfg.widgets || [])
      .filter((w) => w?.entity)
      .slice(0, 4)
      .map((w) => {
        const st = hass?.states?.[w.entity];
        const bg = widgetBgForState(st, w, cfg);
        const icon = widgetIconForState(st, w);
        const label = w.name || prettyName(st, w.entity);

        // Make it keyboard accessible + click like button-card
        return `
          <div class="wbtn" role="button" tabindex="0" data-entity="${esc(w.entity)}"
               style="background:${esc(bg)}; background-color:${esc(bg)};">
            <ha-icon class="wicon" icon="${esc(icon)}"></ha-icon>
            <div class="sr">${esc(label)}</div>
          </div>
        `;
      })
      .join("");

    // If fewer than 4 widgets, keep layout stable (optional)
    const missing = Math.max(0, 4 - (cfg.widgets || []).filter((w) => w?.entity).slice(0, 4).length);
    const placeholders = Array.from({ length: missing })
      .map(() => `<div class="wbtn ph" aria-hidden="true"></div>`)
      .join("");

    this.shadowRoot.innerHTML = `
      <ha-card class="card">
        <div class="root" role="button" tabindex="0" data-entity="${esc(cfg.room_entity || "")}">
          <div class="title">${esc(roomName)}</div>

          <div class="content">
            <div class="big">
              <div class="bigCircle">
                <ha-icon class="bigIcon" icon="${esc(roomIcon)}"></ha-icon>
              </div>
            </div>

            <div class="widgets">
              ${widgets}${placeholders}
            </div>
          </div>
        </div>
      </ha-card>

      <style>
        :host { display:block; }

        ha-card.card {
          background: ${esc(cfg.bg)} !important;
          background-color: ${esc(cfg.bg)} !important;
          color: ${esc(cfg.accent)};
          border-radius: 18px;
          overflow: hidden;
          --mdc-ripple-color: ${esc(cfg.accent)};
          --mdc-ripple-press-opacity: ${esc(cfg.ripple_opacity)};
        }

        .root {
          padding: 14px 14px 12px 14px;
          cursor: pointer;
          user-select: none;
          outline: none;
        }
        .root:focus { box-shadow: 0 0 0 2px rgba(0,0,0,0.12); border-radius: 18px; }

        .title {
          font-weight: 700;
          font-size: 20px;
          line-height: 1.1;
          margin-bottom: 10px;
        }

        .content {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 12px;
        }

        .big {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: flex-end;
        }

        .bigCircle {
          width: 128px;
          height: 128px;
          border-radius: 999px;
          background: ${esc(cfg.icon_bg)} !important;
          background-color: ${esc(cfg.icon_bg)} !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bigIcon {
          width: 64px;
          height: 64px;
          color: ${esc(cfg.accent)} !important;
        }

        .widgets {
          width: 64px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-end;
          justify-content: center;
        }

        .wbtn {
          width: 52px;
          height: 52px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          outline: none;
        }
        .wbtn:hover { filter: brightness(0.98); }
        .wbtn:active { transform: scale(0.98); }
        .wbtn:focus { box-shadow: 0 0 0 2px rgba(0,0,0,0.12); }

        .wicon {
          width: 26px;
          height: 26px;
          color: ${esc(cfg.accent)} !important;
        }

        .wbtn.ph {
          background: transparent !important;
          background-color: transparent !important;
          border: 1px dashed rgba(0,0,0,0.15);
          opacity: 0.35;
          cursor: default;
        }

        .sr {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      </style>
    `;

    // Card tap -> more-info for room_entity
    const root = this.shadowRoot.querySelector(".root");
    const rootEnt = root?.getAttribute("data-entity") || "";
    if (root && rootEnt) {
      root.addEventListener("click", () => this._fireMoreInfo(rootEnt));
      root.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._fireMoreInfo(rootEnt);
        }
      });
    }

    // Widget taps -> more-info for that widget entity
    this.shadowRoot.querySelectorAll(".wbtn[data-entity]").forEach((el) => {
      const ent = el.getAttribute("data-entity");
      if (!ent) return;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this._fireMoreInfo(ent);
      });

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          this._fireMoreInfo(ent);
        }
      });
    });
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return {
      type: "custom:room-card",
      title: "Kitchen",
      room_entity: "light.kitchen",
      bg: "#FFE7C6",
      accent: "#7E4400",
      icon_bg: "#EEC690",
      widget_bg: "rgba(0,0,0,0.08)",
      widgets: [
        { entity: "light.kitchen", icon_on: "mdi:lightbulb", icon_off: "mdi:lightbulb-outline", bg_on: "#FFF3D9" },
        { entity: "switch.kitchen_socket", icon_on: "mdi:power-plug", icon_off: "mdi:power-plug-off", bg_on: "#E7F6EA" },
        { entity: "sensor.kitchen_temperature", icon: "mdi:thermometer", bg: "#F7D6D9" },
      ],
    };
  }
}

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, RoomCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: "Room Card",
  description: "Room tile: big icon + up to 4 circular widgets (button-card-like styling)",
});

console.info(
  "%cROOM-CARD%c loaded (room-tile style)",
  "color:white;background:#03a9f4;padding:2px 6px;",
  "color:#03a9f4"
);
