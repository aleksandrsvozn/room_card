/* room-card.js */
/* Lovelace Room Card with встроенным editor (без dynamic import) */

const CARD_TYPE = "room-card";
const CARD_TAG = "room-card";
const EDITOR_TAG = "room-card-editor";

/* ===================== */
/* ===== Helpers ====== */
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
    this._config = {
      title: config.title ?? "",
      entities: Array.isArray(config.entities) ? config.entities : [],
      show_icon: config.show_icon ?? true,
      show_state_badge: config.show_state_badge ?? true,
      secondary_info: config.secondary_info ?? "last_changed",
      state_colors: config.state_colors ?? null
    };
    this._render();
  }

  _emit() {
    // всегда отправляем валидный конфиг
    const out = {
      type: "custom:room-card",
      title: this._config.title,
      entities: this._config.entities,
      show_icon: this._config.show_icon,
      show_state_badge: this._config.show_state_badge,
      secondary_info: this._config.secondary_info
    };
    if (this._config.state_colors) out.state_colors = this._config.state_colors;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: out }
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

        <label>Entities (one per line)
          <textarea id="entities" rows="6">${esc((c.entities || []).join("\n"))}</textarea>
        </label>

        <label><input type="checkbox" id="icon" ${c.show_icon ? "checked" : ""}> Show icon</label>
        <label><input type="checkbox" id="badge" ${c.show_state_badge ? "checked" : ""}> Show badge</label>

        <label>Secondary info
          <select id="secondary">
            <option value="none">None</option>
            <option value="last_changed">Last changed</option>
            <option value="last_updated">Last updated</option>
          </select>
        </label>
      </div>

      <style>
        .wrap { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        textarea, input, select { width: 100%; box-sizing: border-box; }
        textarea { resize: vertical; }
      </style>
    `;

    const titleEl = this.shadowRoot.querySelector("#title");
    const entitiesEl = this.shadowRoot.querySelector("#entities");
    const iconEl = this.shadowRoot.querySelector("#icon");
    const badgeEl = this.shadowRoot.querySelector("#badge");
    const secondaryEl = this.shadowRoot.querySelector("#secondary");

    secondaryEl.value = c.secondary_info;

    const apply = () => {
      this._config.title = titleEl.value;
      this._config.entities = entitiesEl.value
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean);
      this._config.show_icon = iconEl.checked;
      this._config.show_state_badge = badgeEl.checked;
      this._config.secondary_info = secondaryEl.value;
      this._emit();
    };

    // input для текста, change для select/checkbox — стабильнее
    titleEl.addEventListener("input", apply);
    entitiesEl.addEventListener("input", apply);
    iconEl.addEventListener("change", apply);
    badgeEl.addEventListener("change", apply);
    secondaryEl.addEventListener("change", apply);
  }
}

// Регистрируем editor ПЕРЕД card
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
    if (!config) throw new Error("Пустой config");

    const entities = normalizeEntities(config);
    if (!entities.length) throw new Error("Укажи entity (строка) или entities (массив)");

    this._config = {
      type: "custom:room-card",
      title: config.title ?? "Комната",
      entities,
      show_icon: config.show_icon ?? true,
      show_state_badge: config.show_state_badge ?? true,
      secondary_info: config.secondary_info ?? "last_changed",
      state_colors: config.state_colors ?? null
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return Math.min(1 + (this._config?.entities?.length ?? 1), 6);
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

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const cfg = this._config;
    const hass = this._hass;

    const rows = cfg.entities
      .map((entityId) => {
        const st = hass?.states?.[entityId];
        const badge = cfg.show_state_badge
          ? `<span class="badge" style="background:${badgeColor(st, cfg)}"></span>`
          : "";

        const iconHtml = cfg.show_icon
          ? `<ha-icon class="icon" icon="${esc(st?.attributes?.icon ?? "mdi:home")}"></ha-icon>`
          : "";

        const secondary =
          cfg.secondary_info !== "none" ? esc(formatSecondary(st, cfg.secondary_info)) : "";

        return `
          <div class="row" role="button" tabindex="0" data-entity="${esc(entityId)}">
            ${badge}
            ${iconHtml}
            <div class="main">
              <div class="name">${esc(prettyName(st, entityId))}</div>
              ${secondary ? `<div class="secondary">${secondary}</div>` : ""}
            </div>
            <div class="state">${esc(st?.state ?? "unknown")}${esc(unit(st))}</div>
          </div>
        `;
      })
      .join("");

    this.shadowRoot.innerHTML = `
      <ha-card header="${esc(cfg.title)}">
        <div class="wrap">${rows}</div>
      </ha-card>

      <style>
        :host { display:block; }
        .wrap { padding: 8px; }
        .row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 12px;
          cursor: pointer;
          user-select: none;
        }
        .row:hover { background: rgba(0,0,0,0.05); }
        .row:focus { outline:none; box-shadow: 0 0 0 2px rgba(25,118,210,0.25); }

        .badge { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 10px; }
        .icon { width: 24px; height: 24px; }
        .main { flex: 1; min-width: 0; }
        .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .secondary { font-size: 12px; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .state { font-weight: 600; }
      </style>
    `;

    // Click + keyboard support
    this.shadowRoot.querySelectorAll(".row").forEach((el) => {
      const entityId = el.getAttribute("data-entity");
      if (!entityId) return;

      el.addEventListener("click", () => this._fireMoreInfo(entityId));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._fireMoreInfo(entityId);
        }
      });
    });
  }

  static getConfigElement() {
    // editor уже зарегистрирован выше
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return {
      type: "custom:room-card",
      title: "Комната",
      entities: ["sensor.temperature"],
      show_icon: true,
      show_state_badge: true,
      secondary_info: "last_changed"
    };
  }
}

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, RoomCard);
}

/* ===================== */
/* === HA metadata ===== */
/* ===================== */

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: "Room Card",
  description: "Список сущностей одним блоком (комната)"
});

console.info(
  "%cROOM-CARD%c loaded (single-file)",
  "color:white;background:#03a9f4;padding:2px 6px;",
  "color:#03a9f4"
);
