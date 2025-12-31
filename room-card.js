class EcRoomCard extends HTMLElement {
  setConfig(config) {
    this._config = config;
    if (!this.attachShadow) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 1; }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;

    const cfg = this._config;
    const hass = this._hass;

    const themes = cfg.themes || {
      living_room: { accent: "#7E4400", bg: "#FFE7C6", icon_bg: "#EEC690" },
      office: { accent: "#645510", bg: "#F3F4B6", icon_bg: "#D3D342" }
    };
    const t = themes[cfg.room_theme || "living_room"] || {};
    const accent = cfg.room_accent ?? t.accent ?? "var(--primary-text-color)";
    const bg = cfg.room_bg ?? t.bg ?? "var(--ha-card-background, var(--card-background-color, #fff))";
    const iconBg = cfg.room_icon_bg ?? t.icon_bg ?? "rgba(0,0,0,0.08)";

    const name = cfg.name ?? "Room";
    const icon = cfg.icon ?? "mdi:home-outline";

    const widgetCfgs = [cfg.entity_1, cfg.entity_2, cfg.entity_3, cfg.entity_4].map((x) => {
      if (!x) return null;
      if (typeof x === "string") return { entity: x };
      const ent = x.entity ?? x.entity_id;
      return ent ? { ...x, entity: ent } : null;
    });

    const mkWidget = (w, idx) => {
      if (!w?.entity) return "";
      const st = hass.states[w.entity];
      const state = st?.state ?? "unavailable";
      if (state === "off" && w.hide_when_off) return "";
      if ((state === "unavailable" || state === "unknown") && w.hide_when_unavailable) return "";

      const bgDefault = idx === 3 ? bg : iconBg;
      const wBg =
        state === "on" ? (w.bg_on ?? w.bg ?? bgDefault) :
        state === "off" ? (w.bg_off ?? w.bg ?? bgDefault) :
        (w.bg_unavailable ?? w.bg_off ?? w.bg ?? bgDefault);

      const wIcon =
        state === "on" ? (w.icon_on ?? w.icon ?? "mdi:checkbox-marked-circle") :
        state === "off" ? (w.icon_off ?? w.icon ?? "mdi:checkbox-blank-circle-outline") :
        (w.icon_unavailable ?? w.icon_off ?? w.icon_on ?? w.icon ?? "mdi:help-circle-outline");

      return `
        <div class="w" data-entity="${w.entity}" style="background:${wBg}">
          <ha-icon icon="${wIcon}" style="color:${accent}"></ha-icon>
        </div>
      `;
    };

    this.shadowRoot.innerHTML = `
      <style>
        .card { padding:12px; border-radius:16px; background:${bg}; cursor:pointer; }
        .row { display:flex; gap:12px; align-items:center; }
        .left { display:flex; gap:12px; align-items:center; min-width:0; flex:1; }
        .iconWrap { width:44px; height:44px; border-radius:999px; background:${iconBg}; display:flex; align-items:center; justify-content:center; }
        .title { color:${accent}; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .widgets { display:flex; gap:8px; }
        .w { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
      </style>

      <ha-card class="card">
        <div class="row">
          <div class="left">
            <div class="iconWrap"><ha-icon icon="${icon}" style="color:${accent}"></ha-icon></div>
            <div class="title">${name}</div>
          </div>
          <div class="widgets">
            ${widgetCfgs.map(mkWidget).join("")}
          </div>
        </div>
      </ha-card>
    `;

    // widget click -> more-info by default
    this.shadowRoot.querySelectorAll(".w").forEach((el) => {
      el.addEventListener("click", () => {
        const entityId = el.getAttribute("data-entity");
        this.dispatchEvent(new CustomEvent("hass-more-info", {
          detail: { entityId },
          bubbles: true,
          composed: true
        }));
      });
    });
  }
}

customElements.define("room-card", EcRoomCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "room-card",
  name: "EC Room Card",
  description: "Themed room card with 0..4 right-side widgets."
});

EcRoomCard.getConfigElement = () => document.createElement("ec-room-card-editor");
EcRoomCard.getStubConfig = () => ({ type: "custom:ec-room-card", name: "Room", room_theme: "living_room" });

// lazy-load editor
(async () => {
  await import("./ec-room-card-editor.js");
})();
