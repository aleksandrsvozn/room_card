/* room-card.js */
const CARD_TYPE = "room-card";
const CARD_TAG = "room-card";

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

function unit(stateObj) {
  const u = stateObj?.attributes?.unit_of_measurement;
  return u ? ` ${u}` : "";
}

function badgeColor(stateObj, cfg) {
  const map = cfg?.state_colors;
  if (map && stateObj?.state in map) return map[stateObj.state];

  const s = String(stateObj?.state ?? "").toLowerCase();
  if (["on", "true", "open", "opened", "home", "detected"].includes(s)) return "#2e7d32";
  if (["off", "false", "closed", "not_home", "idle", "clear"].includes(s)) return "#616161";
  if (["unavailable", "unknown"].includes(s)) return "#9e9e9e";
  return "#1976d2";
}

function formatSecondary(stateObj, mode) {
  if (!stateObj) return "";
  if (mode === "last_changed" && stateObj.last_changed) {
    return `Изменено: ${new Date(stateObj.last_changed).toLocaleString()}`;
  }
  if (mode === "last_updated" && stateObj.last_updated) {
    return `Обновлено: ${new Date(stateObj.last_updated).toLocaleString()}`;
  }
  return "";
}

class RoomCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
  }

  setConfig(config) {
    if (!config) throw new Error("Пустой config");

    const entities = normalizeEntities(config);
    if (!entities.length) throw new Error("Укажи entity (строка) или entities (массив)");

    this._config = {
      type: "custom:room-card",
      title: config.title ?? "Комната",
      entities,
      show_icon: config.show_icon ?? true,
      show_state_badge: config.show_state_badge ?? true,
      secondary_info: config.secondary_info ?? "last_changed", // none | last_changed | last_updated
      state_colors: config.state_colors ?? null
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    const n = this._config?.entities?.length ?? 1;
    return Math.min(1 + n, 6);
  }

  _fireMoreInfo(entityId) {
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId }
      })
    );
  }

  _bindRowClicks() {
    const rows = this.shadowRoot?.querySelectorAll(".row");
    rows?.forEach((row) => {
      const entityId = row.getAttribute("data-entity");
      if (!entityId) return;

      row.addEventListener("click", () => this._fireMoreInfo(entityId));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._fireMoreInfo(entityId);
        }
      });
    });
  }

  _render() {
    if (!this.shadowRoot) return;
    const cfg = this._config;

    if (!cfg) {
      this.shadowRoot.innerHTML = `<div style="padding:12px;">Нет config</div>`;
      return;
    }

    const hass = this._hass;
    const rowsHtml = cfg.entities
      .map((entityId) => {
        const st = hass?.states?.[entityId];
        const name = esc(prettyName(st, entityId));
        const state = esc(st?.state ?? "unknown");
        const u = esc(unit(st));
        const icon = esc(st?.attributes?.icon ?? "mdi:home");
        const secondary = esc(formatSecondary(st, cfg.secondary_info));
        const bColor = badgeColor(st, cfg);

        const badge = cfg.show_state_badge
          ? `<span class="badge" style="background:${bColor}"></span>`
          : "";

        const iconHtml = cfg.show_icon
          ? `<ha-icon class="icon" icon="${icon}"></ha-icon>`
          : `<div class="icon-spacer"></div>`;

        return `
          <div class="row" role="button" tabindex="0" data-entity="${esc(entityId)}">
            ${badge}
            ${iconHtml}
            <div class="main">
              <div class="name">${name}</div>
              ${secondary && cfg.secondary_info !== "none" ? `<div class="secondary">${secondary}</div>` : ""}
            </div>
            <div class="state">${state}${u}</div>
          </div>
        `;
      })
      .join("");

    this.shadowRoot.innerHTML = `
      <ha-card header="${esc(cfg.title)}">
        <div class="wrap">
          ${rowsHtml}
        </div>
      </ha-card>

      <style>
        :host { display:block; }
        .wrap { padding: 8px 8px 10px 8px; }

        .row {
          display:flex;
          align-items:center;
          gap:10px;
          padding:10px 8px;
          border-radius:12px;
          cursor:pointer;
          user-select:none;
        }
        .row:hover { background: rgba(0,0,0,0.04); }
        .row:focus { outline:none; box-shadow: 0 0 0 2px rgba(25,118,210,0.25); }

        .badge {
          width:10px; height:10px;
          border-radius:50%;
          flex: 0 0 10px;
        }

        .icon { width:24px; height:24px; opacity:0.9; }
        .icon-spacer { width:24px; height:24px; }

        .main { flex:1 1 auto; min-width:0; }
        .name {
          font-weight:600;
          line-height:1.2;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .secondary {
          margin-top:2px;
          font-size:12px;
          opacity:0.75;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .state { flex:0 0 auto; font-weight:600; opacity:0.9; }
      </style>
    `;

    this._bindRowClicks();
  }

  // Визуальный редактор
  static async getConfigElement() {
    // берём query-параметры (hacstag=...) из текущего модуля room-card.js
    const currentUrl = new URL(import.meta.url);
    const editorUrl = new URL("./room-card-editor.js", currentUrl);

    // переносим ?hacstag=... в URL editor’а
    editorUrl.search = currentUrl.search;

    await import(editorUrl.toString());
    return document.createElement("room-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:room-card",
      title: "Комната",
      entities: ["sensor.temperature", "sensor.humidity"],
      show_icon: true,
      show_state_badge: true,
      secondary_info: "last_changed"
    };
  }
}

customElements.define(CARD_TAG, RoomCard);

// Подсказка для списка Custom Cards
window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: "Room Card",
  description: "Список сущностей одним блоком (комната/зона)"
});

console.info(
  "%cROOM-CARD%c v1.0.0",
  "color:white;background:#03a9f4;padding:2px 6px;border-radius:3px;",
  "color:#03a9f4"
);





// Editor
/* room-card-editor.js */
const EDITOR_TAG = "room-card-editor";

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function linesToEntities(value) {
  return String(value || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function entitiesToLines(entities) {
  return Array.isArray(entities) ? entities.join("\n") : "";
}

class RoomCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
  }

  set hass(hass) {
    this._hass = hass;
    // Можно не ререндерить на каждое обновление hass.
    // Но безопасно оставить — UI HA иногда ждёт актуализации.
    this._render();
  }

  setConfig(config) {
    const entities =
      Array.isArray(config.entities) ? config.entities :
      typeof config.entity === "string" ? [config.entity] : [];

    this._config = {
      type: "custom:room-card",
      title: config.title ?? "Комната",
      entities,
      show_icon: config.show_icon ?? true,
      show_state_badge: config.show_state_badge ?? true,
      secondary_info: config.secondary_info ?? "last_changed",
      // опционально: карта цветов { "on": "#00ff00", "off": "#999" }
      state_colors: config.state_colors ?? null
    };

    this._render();
  }

  _emitChanged() {
    if (!this._config) return;

    const out = {
      type: "custom:room-card",
      title: this._config.title,
      entities: this._config.entities,
      show_icon: this._config.show_icon,
      show_state_badge: this._config.show_state_badge,
      secondary_info: this._config.secondary_info
    };

    // state_colors сохраняем только если задано
    if (this._config.state_colors && Object.keys(this._config.state_colors).length) {
      out.state_colors = this._config.state_colors;
    }

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: out }
      })
    );
  }

  _onInput(e) {
    const t = e.target;
    if (!this._config) return;

    switch (t.id) {
      case "title":
        this._config.title = t.value;
        break;

      case "entities":
        this._config.entities = linesToEntities(t.value);
        break;

      case "show_icon":
        this._config.show_icon = t.checked;
        break;

      case "show_state_badge":
        this._config.show_state_badge = t.checked;
        break;

      case "secondary_info":
        this._config.secondary_info = t.value;
        break;

      case "state_colors":
        // Формат: one per line -> state=#RRGGBB
        // пример:
        // on=#2e7d32
        // off=#616161
        this._config.state_colors = parseStateColors(t.value);
        if (this._config.state_colors && !Object.keys(this._config.state_colors).length) {
          this._config.state_colors = null;
        }
        break;

      default:
        break;
    }

    this._emitChanged();
  }

  _render() {
    if (!this.shadowRoot) return;
    if (!this._config) {
      this.shadowRoot.innerHTML = `<div style="padding:12px;">Нет config</div>`;
      return;
    }

    const c = this._config;
    const stateColorsText = stateColorsToText(c.state_colors);

    this.shadowRoot.innerHTML = `
      <div class="wrap">
        <div class="field">
          <label>Заголовок</label>
          <input id="title" type="text" value="${esc(c.title)}" />
        </div>

        <div class="field">
          <label>Entities (по одной на строку)</label>
          <textarea id="entities" rows="7"
            placeholder="sensor.livingroom_temperature&#10;sensor.livingroom_humidity"
          >${esc(entitiesToLines(c.entities))}</textarea>
        </div>

        <div class="row">
          <label class="check">
            <input id="show_icon" type="checkbox" ${c.show_icon ? "checked" : ""}/>
            <span>Показывать иконки</span>
          </label>

          <label class="check">
            <input id="show_state_badge" type="checkbox" ${c.show_state_badge ? "checked" : ""}/>
            <span>Индикатор состояния</span>
          </label>
        </div>

        <div class="field">
          <label>Secondary info</label>
          <select id="secondary_info">
            <option value="none" ${c.secondary_info === "none" ? "selected" : ""}>Не показывать</option>
            <option value="last_changed" ${c.secondary_info === "last_changed" ? "selected" : ""}>Последнее изменение</option>
            <option value="last_updated" ${c.secondary_info === "last_updated" ? "selected" : ""}>Последнее обновление</option>
          </select>
        </div>

        <div class="field">
          <label>State colors (опционально, по строке: state=#RRGGBB)</label>
          <textarea id="state_colors" rows="5" placeholder="on=#2e7d32&#10;off=#616161">${esc(stateColorsText)}</textarea>
          <div class="hint">Оставь пустым — будет дефолтная логика цветов.</div>
        </div>
      </div>

      <style>
        :host { display:block; }
        .wrap { padding: 12px; }

        .field { display:flex; flex-direction:column; gap:6px; margin-bottom: 12px; }
        label { font-size:12px; opacity:0.85; }

        input, textarea, select {
          font-size: 14px;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.2);
          outline: none;
        }
        textarea { resize: vertical; }

        .row { display:flex; gap:16px; flex-wrap: wrap; margin: 8px 0 12px; }
        .check { display:flex; align-items:center; gap:8px; font-size:14px; }

        .hint { font-size:12px; opacity:0.7; }
      </style>
    `;

    // Listeners
    this.shadowRoot.querySelector("#title")?.addEventListener("input", (e) => this._onInput(e));
    this.shadowRoot.querySelector("#entities")?.addEventListener("input", (e) => this._onInput(e));
    this.shadowRoot.querySelector("#show_icon")?.addEventListener("change", (e) => this._onInput(e));
    this.shadowRoot.querySelector("#show_state_badge")?.addEventListener("change", (e) => this._onInput(e));
    this.shadowRoot.querySelector("#secondary_info")?.addEventListener("change", (e) => this._onInput(e));
    this.shadowRoot.querySelector("#state_colors")?.addEventListener("input", (e) => this._onInput(e));
  }
}

function parseStateColors(text) {
  const out = {};
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = val;
  }
  return out;
}

function stateColorsToText(map) {
  if (!map || typeof map !== "object") return "";
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

customElements.define(EDITOR_TAG, RoomCardEditor);

console.info("ROOM-CARD editor loaded");
