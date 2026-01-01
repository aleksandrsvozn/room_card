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
