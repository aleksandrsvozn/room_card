
---

# 3️⃣ `dist/room-card.js`

```js
import "./room-card-editor.js";

const DEFAULT_THEMES = {
  living_room: { accent: "#7E4400", bg: "#FFE7C6", icon_bg: "#EEC690" },
  office: { accent: "#645510", bg: "#F3F4B6", icon_bg: "#D3D342" },
};

class RoomCard extends HTMLElement {
  static getStubConfig() {
    return { type: "custom:room-card", name: "Room", room_theme: "living_room" };
  }

  static getConfigElement() {
    return document.createElement("room-card-editor");
  }

  setConfig(config) {
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
    if (!this._config || !this._hass) return;

    const cfg = this._config;
    const hass = this._hass;

    const theme = DEFAULT_THEMES[cfg.room_theme] || DEFAULT_THEMES.living_room;
    const accent = cfg.room_accent ?? theme.accent;
    const bg = cfg.room_bg ?? theme.bg;
    const iconBg = cfg.room_icon_bg ?? theme.icon_bg;

    const widgets = [cfg.entity_1, cfg.entity_2, cfg.entity_3, cfg.entity_4]
      .map((w, i) => {
        if (!w) return null;
        const entity = w.entity ?? w.entity_id;
        if (!entity) return null;

        const st = hass.states[entity];
        const state = st?.state ?? "unavailable";

        if (state === "off" && w.hide_when_off) return null;
        if ((state === "unavailable" || state === "unknown") && w.hide_when_unavailable) return null;

        const icon =
          state === "on"
            ? w.icon_on ?? w.icon ?? "mdi:checkbox-marked-circle"
            : state === "off"
            ? w.icon_off ?? w.icon ?? "mdi:checkbox-blank-circle-outline"
            : w.icon_unavailable ?? w.icon ?? "mdi:help-circle-outline";

        const bgColor =
          state === "on"
            ? w.bg_on ?? w.bg ?? iconBg
            : state === "off"
            ? w.bg_off ?? w.bg ?? iconBg
            : w.bg_unavailable ?? w.bg ?? iconBg;

        return `
          <div class="w" data-entity="${entity}" style="background:${bgColor}">
            <ha-icon icon="${icon}" style="color:${accent}"></ha-icon>
          </div>
        `;
      })
      .filter(Boolean)
      .join("");

    this.shadowRoot.innerHTML = `
      <style>
        .card { padding:12px; border-radius:16px; background:${bg}; }
        .row { display:flex; align-items:center; gap:12px; }
        .left { flex:1; display:flex; align-items:center; gap:12px; }
        .icon { width:44px; height:44px; border-radius:50%; background:${iconBg};
                display:flex; align-items:center; justify-content:center; }
        .name { font-weight:600; color:${accent}; }
        .widgets { display:flex; gap:8px; }
        .w { width:40px; height:40px; border-radius:12px;
             display:flex; align-items:center; justify-content:center; }
      </style>

      <ha-card class="card">
        <div class="row">
          <div class="left">
            <div class="icon"><ha-icon icon="${cfg.icon ?? "mdi:home"}" style="color:${accent}"></ha-icon></div>
            <div class="name">${cfg.name ?? "Room"}</div>
          </div>
          <div class="widgets">${widgets}</div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll(".w").forEach((el) => {
      el.addEventListener("click", () => {
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
window.customCards.push({
  type: "room-card",
  name: "Room Card",
  description: "Themed room card with up to 4 widgets",
});
