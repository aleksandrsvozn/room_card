import "./room-card-editor.js";

const THEMES = {
  living_room: { accent: "#7E4400", bg: "#FFE7C6", icon_bg: "#EEC690" },
  office: { accent: "#645510", bg: "#F3F4B6", icon_bg: "#D3D342" },
};

function normW(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return { entity: raw };
  if (typeof raw !== "object") return null;
  const ent = raw.entity ?? raw.entity_id;
  return ent ? { ...raw, entity: ent } : null;
}

class RoomCard extends HTMLElement {
  static getConfigElement() { return document.createElement("room-card-editor"); }
  static getStubConfig() { return { type: "custom:room-card", name: "Room", room_theme: "living_room" }; }

  setConfig(config) {
    this._config = config;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  set hass(hass) { this._hass = hass; this._render(); }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;

    const cfg = this._config;
    const hass = this._hass;

    const t = THEMES[cfg.room_theme] || THEMES.living_room;
    const accent = cfg.room_accent ?? t.accent ?? "var(--primary-text-color)";
    const bg = cfg.room_bg ?? t.bg ?? "var(--ha-card-background, var(--card-background-color, #fff))";
    const iconBg = cfg.room_icon_bg ?? t.icon_bg ?? "rgba(0,0,0,0.08)";

    const widgets = [cfg.entity_1, cfg.entity_2, cfg.entity_3, cfg.entity_4]
      .map(normW)
      .map((w, idx) => {
        if (!w) return "";
        const st = hass.states[w.entity];
        const state = st?.state ?? "unavailable";

        if (state === "off" && w.hide_when_off) return "";
        if ((state === "unavailable" || state === "unknown") && w.hide_when_unavailable) return "";

        const icon =
          state === "on" ? (w.icon_on ?? w.icon ?? "mdi:checkbox-marked-circle") :
          state === "off" ? (w.icon_off ?? w.icon ?? "mdi:checkbox-blank-circle-outline") :
          (w.icon_unavailable ?? w.icon ?? "mdi:help-circle-outline");

        const baseBg = w.bg ?? (idx === 3 ? bg : iconBg);
        const wBg =
          state === "on" ? (w.bg_on ?? baseBg) :
          state === "off" ? (w.bg_off ?? baseBg) :
          (w.bg_unavailable ?? w.bg_off ?? baseBg);

        return `
          <div class="w" data-entity="${w.entity}" style="background:${wBg}">
            <ha-icon icon="${icon}" style="color:${accent}"></ha-icon>
          </div>
        `;
      })
      .join("");

    this.shadowRoot.innerHTML = `
      <style>
        .card{padding:12px;border-radius:16px;background:${bg};}
        .row{display:flex;align-items:center;gap:12px;}
        .left{flex:1;display:flex;align-items:center;gap:12px;min-width:0;}
        .iconWrap{width:44px;height:44px;border-radius:999px;background:${iconBg};display:flex;align-items:center;justify-content:center;}
        .title{font-weight:600;color:${accent};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .widgets{display:flex;gap:8px;}
        .w{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;}
      </style>
      <ha-card class="card">
        <div class="row">
          <div class="left">
            <div class="iconWrap">
              <ha-icon icon="${cfg.icon ?? "mdi:home-outline"}" style="color:${accent}"></ha-icon>
            </div>
            <div class="title">${cfg.name ?? "Room"}</div>
          </div>
          <div class="widgets">${widgets}</div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll(".w").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.dispatchEvent(
          new CustomEvent("hass-more-info", {
            detail: { entityId: el.dataset.entity },
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
window.customCards.push({ type: "room-card", name: "Room Card", description: "Themed room card with up to 4 widgets" });
