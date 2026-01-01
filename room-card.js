/* room-card.js
 * A lightweight Lovelace custom card inspired by UI Lovelace Minimalist "card_room".
 * No build tools required.
 */

const fireEvent = (node, type, detail = {}, options = {}) => {
  const event = new Event(type, {
    bubbles: options.bubbles ?? true,
    cancelable: options.cancelable ?? false,
    composed: options.composed ?? true,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};

const DEFAULT_ACTION = { action: "toggle" };

function isActionEmpty(a) {
  return !a || a.action === "none";
}

function getEntityState(hass, entityId) {
  return entityId ? hass.states[entityId] : undefined;
}

function friendlyName(stateObj, fallback) {
  return stateObj?.attributes?.friendly_name || fallback || "";
}

function entityIcon(stateObj, fallbackIcon) {
  return stateObj?.attributes?.icon || fallbackIcon || "mdi:home";
}

function clampSubEntities(arr, max = 4) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, max);
}

function computeLabel({ hass, stateObj, labelUseTemp, labelUseBri }) {
  if (!stateObj) return "-";
  const attrs = stateObj.attributes || {};

  if (labelUseTemp) {
    const v =
      attrs.current_temperature ??
      attrs.temperature ??
      attrs.device_temperature ??
      stateObj.state ??
      "-";
    const uom = attrs.unit_of_measurement || "°C";
    return `${v}${typeof v === "number" ? uom : uom}`;
  }

  if (
    labelUseBri &&
    stateObj.state === "on" &&
    attrs.brightness !== undefined &&
    attrs.brightness !== null
  ) {
    const bri = Math.round(Number(attrs.brightness) / 2.55);
    return `${Number.isFinite(bri) ? bri : 0}%`;
  }

  return stateObj.state ?? "-";
}

async function handleAction(el, hass, entityId, actionConfig) {
  const a = actionConfig || DEFAULT_ACTION;
  const action = a.action || "toggle";
  if (action === "none") return;

  if (action === "more-info") {
    fireEvent(el, "hass-more-info", { entityId });
    return;
  }

  if (action === "navigate") {
    const path = a.navigation_path || a.navigationPath;
    if (path) history.pushState(null, "", path);
    fireEvent(window, "location-changed", { replace: false });
    return;
  }

  if (action === "url") {
    const url = a.url_path || a.urlPath;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  if (action === "toggle") {
    if (!entityId) return;
    const st = hass.states[entityId];
    if (!st) return;

    const domain = entityId.split(".")[0];
    let service = "toggle";
    if (domain === "script" || domain === "scene") service = "turn_on";

    await hass.callService(domain, service, { entity_id: entityId });
    return;
  }

  if (action === "call-service") {
    const s = a.service;
    if (!s || typeof s !== "string" || !s.includes(".")) return;
    const [domain, service] = s.split(".");
    const data = { ...(a.service_data || a.data || {}) };

    if (entityId && data.entity_id === undefined) data.entity_id = entityId;

    await hass.callService(domain, service, data);
    return;
  }
}

class RoomCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: "custom:room-card",
      entity: "light.living_room",
      name: "Living Room",
      icon: "mdi:sofa-single",
      label_use_temperature: true,
      label_use_brightness: false,
      sub_entities: [
        {
          entity: "light.living_room",
          icon: "mdi:lightbulb",
          tap_action: { action: "toggle" },
          color_on: "var(--warning-color)",
        },
        {
          entity: "binary_sensor.motion",
          icon: "mdi:motion-sensor",
          tap_action: { action: "more-info" },
          color_on: "var(--info-color)",
        },
      ],
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    if (!config.entity) throw new Error("You need to define an entity");
    this._config = {
      label_use_temperature: true,
      label_use_brightness: false,
      ...config,
    };
    if (!this._root) {
      this.attachShadow({ mode: "open" });
      this._root = document.createElement("div");
      this.shadowRoot.appendChild(this._root);
      this._injectStyles();
    }
    this._render();
  }

  getCardSize() {
    return 3;
  }

  _injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      :host { display:block; }

      .card {
        position: relative;
        overflow: hidden;
        border-radius: var(--ha-card-border-radius, 16px);
        background: var(--ha-card-background, var(--card-background-color, #fff));
        box-shadow: var(--ha-card-box-shadow, none);
        padding: 12px;
        cursor: pointer;
        user-select: none;
      }

      .grid {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: stretch;
        min-height: 130px; /* чуть выше, чтобы как на скрине было больше воздуха */
      }

      .main {
        position: relative;
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 2px;
        align-items: start;

        /* место под большой круг снизу-слева */
        padding-bottom: 86px;
      }

      .name {
        font-size: 18px;
        font-weight: 700;
        line-height: 1.15;
        overflow:hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        z-index: 2;
      }

      .label {
        font-size: 14px;
        font-weight: 700;
        opacity: 0.55;
        overflow:hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        z-index: 2;
      }

      /* Большой круг как на скриншоте */
      .roomBubble {
        position: absolute;
        left: -52px;     /* “вылазит” за край */
        bottom: -56px;   /* “вылазит” за край */
        width: 200px;    /* размер фона-круга */
        height: 200px;
        border-radius: 999px;

        /* мягкая заливка в стиле скрина */
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);

        display: flex;
        align-items: center;
        justify-content: center;

        /* чтобы клики проходили на main/card */
        pointer-events: none;

        z-index: 1;
      }

      /* Большая иконка внутри круга */
      .roomBubble ha-icon {
        width: 64px;
        height: 64px;
        color: color-mix(in srgb, var(--primary-color) 80%, var(--primary-text-color));
      }

      .subs {
        display: grid;
        grid-auto-rows: min-content;
        align-content: center;
        gap: 10px;
        padding-left: 6px;
      }

      .subBtn {
        width: 34px;
        height: 34px;
        border-radius: 999px;
        display:flex;
        align-items:center;
        justify-content:center;
        background: color-mix(in srgb, var(--secondary-text-color) 12%, transparent);
      }

      .subBtn ha-icon {
        width: 18px;
        height: 18px;
        color: var(--secondary-text-color);
      }

      .subBtn.on {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
      }

      .unavailableDot {
        position:absolute;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        right: 10px;
        top: 10px;
        background: var(--error-color, #db4437);
        border: 2px solid var(--ha-card-background, var(--card-background-color, #fff));
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  _render() {
    if (!this._root || !this._hass || !this._config) return;

    const hass = this._hass;
    const cfg = this._config;

    const stateObj = getEntityState(hass, cfg.entity);
    const name = cfg.name || friendlyName(stateObj, cfg.entity);
    const icon = entityIcon(stateObj, cfg.icon);

    const label = computeLabel({
      hass,
      stateObj,
      labelUseTemp: !!cfg.label_use_temperature,
      labelUseBri: !!cfg.label_use_brightness,
    });

    const unavailable = stateObj?.state === "unavailable";

    const subs = clampSubEntities(cfg.sub_entities, 4).map((s) => {
      const so = getEntityState(hass, s.entity);
      const subIcon = s.icon || entityIcon(so, "mdi:flash");
      const isOn = so?.state === "on";
      const colorOn = s.color_on || "var(--primary-color)";
      const colorOff = s.color_off || "var(--secondary-text-color)";

      const tap = s.tap_action || DEFAULT_ACTION;
      const hold = s.hold_action;
      const dbl = s.double_tap_action;

      return { ...s, so, subIcon, isOn, colorOn, colorOff, tap, hold, dbl };
    });

    this._root.innerHTML = `
      <ha-card class="card">
        ${unavailable ? `<div class="unavailableDot" title="unavailable"></div>` : ""}
        <div class="grid">
          <div class="main" id="main">
            <div class="name" title="${this._escape(name)}">${this._escape(name)}</div>
            <div class="label" title="${this._escape(label)}">${this._escape(label)}</div>
            <div></div>

            <div class="roomBubble" aria-hidden="true">
              <ha-icon icon="${icon}"></ha-icon>
            </div>
          </div>

          <div class="subs">
            ${subs
              .map((s, idx) => {
                const cls = `subBtn ${s.isOn ? "on" : ""}`;
                const color = s.isOn ? s.colorOn : s.colorOff;
                return `
                  <div class="${cls}" id="sub-${idx}" title="${this._escape(s.entity || "")}">
                    <ha-icon icon="${s.subIcon}" style="color:${color}"></ha-icon>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      </ha-card>
    `;

    const mainEl = this.shadowRoot.getElementById("main");
    mainEl.onclick = () =>
      handleAction(this, hass, cfg.entity, cfg.tap_action || DEFAULT_ACTION);

    subs.forEach((s, idx) => {
      const el = this.shadowRoot.getElementById(`sub-${idx}`);
      if (!el) return;

      el.onclick = (e) => {
        e.stopPropagation();
        handleAction(this, hass, s.entity, s.tap);
      };

      let holdTimer = null;
      if (!isActionEmpty(s.hold)) {
        el.onpointerdown = (e) => {
          e.stopPropagation();
          holdTimer = window.setTimeout(() => {
            handleAction(this, hass, s.entity, s.hold);
            holdTimer = null;
          }, 500);
        };
        el.onpointerup = (e) => {
          e.stopPropagation();
          if (holdTimer) window.clearTimeout(holdTimer);
          holdTimer = null;
        };
        el.onpointerleave = () => {
          if (holdTimer) window.clearTimeout(holdTimer);
          holdTimer = null;
        };
      }
      if (!isActionEmpty(s.dbl)) {
        el.ondblclick = (e) => {
          e.stopPropagation();
          handleAction(this, hass, s.entity, s.dbl);
        };
      }
    });
  }

  _escape(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

customElements.define("room-card", RoomCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "room-card",
  name: "Room Card",
  description: "A room tile with up to 4 sub-icons (inspired by ULM card_room).",
});
