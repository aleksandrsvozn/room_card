import "./room-card-editor.js";

const DEFAULT_THEMES = {
  living_room: { accent: "#7E4400", bg: "#FFE7C6", icon_bg: "#EEC690" },
  office: { accent: "#645510", bg: "#F3F4B6", icon_bg: "#D3D342" },
};

function normalizeWidget(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return { entity: raw };
  if (typeof raw !== "object") return null;
  const ent = raw.entity ?? raw.entity_id;
  if (!ent) return null;
  return { ...raw, entity: ent };
}

function getState(hass, entity) {
  const st = hass?.states?.[entity];
  if (!st) return "unavailable";
  return String(st.state ?? "unavailable");
}

function widgetIcon(w, state) {
  if (state === "on") return w.icon_on ?? w.icon ?? "mdi:checkbox-marked-circle";
  if (state === "off") return w.icon_off ?? w.icon ?? "mdi:checkbox-blank-circle-outline";
  return w.icon_unavailable ?? w.icon_off ?? w.icon_on ?? w.icon ?? "mdi:help-circle-outline";
}

function widgetBg(w, state, iconBg, roomBg, idx) {
  const base = w.bg ?? (idx === 3 ? roomBg : iconBg);
  if (state === "on") return w.bg_on ?? base;
  if (state === "off") return w.bg_off ?? base;
  return w.bg_unavailable ?? w.bg_off ?? base;
}

class RoomCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("room-card-editor");
  }

  static getStubConfig() {
    return { type: "custom:room-card", name: "Room", room_theme: "living_room" };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid config");
    this._config = config;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 1;
  }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;

    const cfg = this._config;
    const hass = this._hass;

    const t = DEFAULT_THEMES[cfg.room_theme] || DEFAULT_THEMES.living_room;
    const accent = cfg.room_accent ?? t.accent ?? "var(--primary-text-color)";
    const bg = cfg.room_bg ?? t.bg ?? "var(--ha-card-background, var(--card-background-color, #fff))";
    const iconBg = cfg.room_icon_bg ?? t.icon_bg ?? "rgba(0,0,0,0.08)";

    const name = cfg.name ?? "Room";
    const icon = cfg.icon ?? "mdi:home-outline";

    const widgets = [cfg.entity_1, cfg.entity_2, cfg.entity_3, cfg.entity_4]
      .map(normalizeWidget)
      .map((w) => {
        if (!w) return null;
        const state = getState(hass, w.entity);
        return { ...w, _state: state };
      });

    const widgetHtml = widgets
      .map((w, idx) => {
        if (!w) return "";
        const s = w._state;

        if (s === "off" && w.hide_when_off) return "";
        if ((s === "unavailable" || s === "unknown") && w.hide_when_unavailable) return "";

        const wIcon = widgetIcon(w, s);
        const wBg = widgetBg(w, s, iconBg, bg, idx);

        return `
          <div class="w" data-entity="${w.entity}" style="background:${wBg}">
            <ha-icon icon="${wIcon}" style="color:${accent}"></ha-icon>
          </div>
        `;
      })
      .join("");

    this.shadowRoot.innerHTML = `
      <style>
        .card { padding: 12px; border-radius: 16px; background: ${bg}; cursor: pointer; user-select: none; }
        .row { display:flex; align-items:center; gap: 12px; }
        .left { flex: 1; display:flex; align-items:center; gap: 12px; min-width: 0; }
        .iconWrap {
          width: 44px; height: 44px; border-radius: 999px;
          background: ${iconBg}; display:flex; align-items:center; justify-content:center;
          flex: 0 0 auto;
        }
        .title {
          font-weight: 600; color: ${accent};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .widgets { display:flex; gap: 8px; }
        .w {
          width: 40px; height: 40px; border-radius: 12px;
          display:flex; align-items:center; justify-content:center;
        }
      </style>

      <ha-card class="card">
        <div class="row">
          <div class="left">
            <div class="iconWrap">
              <ha-icon icon="${icon}" style="color:${accent}"></ha-icon>
            </div>
            <div class="title">${name}</div>
          </div>
          <div class="widgets">${widgetHtml}</div>
        </div>
      </ha-card>
    `;

    // click widget -> more-info
    this.shadowRoot.querySelectorAll(".w").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const entityId = el.dataset.entity;
        this.dispatchEvent(
          new CustomEvent("hass-more-info", {
            detail: { entityId },
            bubbles: true,
            composed: true,
          })
        );
      });
    });
  }
}

customElements.define("room-card", RoomCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "room-card",
  name: "Room Card",
  description: "Themed room card with up to 4 right-side widgets (integration wrapper).",
});
