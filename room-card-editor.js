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
    this._render();
  }

  setConfig(config) {
    const entities = Array.isArray(config.entities)
      ? config.entities
      : typeof config.entity === "string"
        ? [config.entity]
        : [];

    this._config = {
      title: config.title ?? "Комната",
      entities,
      show_icon: config.show_icon ?? true,
      show_state_badge: config.show_state_badge ?? true,
      secondary_info: config.secondary_info ?? "last_changed"
    };

    this._render();
  }

  _emitChanged() {
    if (!this._config) return;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: {
          config: {
            type: "custom:room-card",
            title: this._config.title,
            entities: this._config.entities,
            show_icon: this._config.show_icon,
            show_state_badge: this._config.show_state_badge,
            secondary_info: this._config.secondary_info
          }
        }
      })
    );
  }

  _onInput(e) {
    const t = e.target;
    if (!this._config) return;

    if (t.id === "title") this._config.title = t.value;
    if (t.id === "entities") this._config.entities = linesToEntities(t.value);
    if (t.id === "show_icon") this._config.show_icon = t.checked;
    if (t.id === "show_state_badge") this._config.show_state_badge = t.checked;
    if (t.id === "secondary_info") this._config.secondary_info = t.value;

    this._emitChanged();
  }

  _render() {
    if (!this.shadowRoot) return;
    if (!this._config) {
      this.shadowRoot.innerHTML = `<div style="padding:12px;">Нет config</div>`;
      return;
    }

    const c = this._config;

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

        <div class="hint">
          Подсказка: вставь список entity — по одному на строку.
        </div>
      </div>

      <style>
        :host { display:block; }
        .wrap { padding: 12px; }
        .field { display:flex; flex-direction:column; gap:6px; margin-bottom: 12px; }
        label { font-size:12px; opacity:0.8; }
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

    this.shadowRoot.querySelector("#title")?.addEventListener("input", (e) => this._onInput(e));
    this.shadowRoot.querySelector("#entities")?.addEventListener("input", (e) => this._onInput(e));
    this.shadowRoot.querySelector("#show_icon")?.addEventListener("change", (e) => this._onInput(e));
    this.shadowRoot.querySelector("#show_state_badge")?.addEventListener("change", (e) => this._onInput(e));
    this.shadowRoot.querySelector("#secondary_info")?.addEventListener("change", (e) => this._onInput(e));
  }
}

customElements.define(EDITOR_TAG, RoomCardEditor);
