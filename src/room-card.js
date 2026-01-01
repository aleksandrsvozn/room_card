class RoomCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Нужно указать entity");
    }
    this._config = config;
  }

  getCardSize() {
    return 2;
  }

  _render() {
    if (!this._hass || !this._config) return;

    const entityId = this._config.entity;
    const stateObj = this._hass.states[entityId];

    const title = this._config.title ?? "Room Card";
    const state = stateObj ? stateObj.state : "unknown";
    const friendly = stateObj?.attributes?.friendly_name ?? entityId;

    this.innerHTML = `
      <ha-card header="${title}">
        <div style="padding: 16px;">
          <div style="font-weight: 600; margin-bottom: 6px;">${friendly}</div>
          <div>Состояние: <b>${state}</b></div>
        </div>
      </ha-card>
    `;
  }
}

customElements.define("room-card", RoomCard);

// Чтобы HA понимал версию/отладку:
console.info("%cROOM-CARD%c v0.1.0", "color: white; background: #03a9f4; padding: 2px 6px; border-radius: 3px;", "color: #03a9f4;");
