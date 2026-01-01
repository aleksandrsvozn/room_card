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
    // cache-busting, чтобы после обновлений HACS не тянуть старый editor из кеша
    await import(`./room-card-editor.js?v=1.0.0`);
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
