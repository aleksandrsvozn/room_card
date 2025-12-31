class RoomCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  _emit(config) {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _val(id) {
    return this.shadowRoot.getElementById(id)?.value ?? "";
  }

  _render() {
    const c = this._config;

    const e = (x) => (typeof x === "object" ? (x.entity_id ?? x.entity ?? "") : (x ?? ""));

    this.shadowRoot.innerHTML = `
      <style>
        .wrap { display: grid; gap: 12px; }
        .row { display: grid; gap: 6px; }
        label { font-size: 12px; opacity: .8; }
        input, select { padding: 8px; width: 100%; box-sizing: border-box; }
      </style>

      <div class="wrap">
        <div class="row">
          <label>Название</label>
          <input id="name" value="${c.name ?? ""}" placeholder="Офис"/>
        </div>

        <div class="row">
          <label>Иконка (mdi:...)</label>
          <input id="icon" value="${c.icon ?? ""}" placeholder="mdi:laptop"/>
        </div>

        <div class="row">
          <label>Тема</label>
          <select id="room_theme">
            <option value="living_room">living_room</option>
            <option value="office">office</option>
          </select>
        </div>

        <div class="row">
          <label>Widget 1 entity</label>
          <input id="e1" value="${e(c.entity_1)}" placeholder="light.xxx"/>
        </div>

        <div class="row">
          <label>Widget 2 entity</label>
          <input id="e2" value="${e(c.entity_2)}" placeholder="switch.xxx"/>
        </div>

        <div class="row">
          <label>Widget 3 entity</label>
          <input id="e3" value="${e(c.entity_3)}" placeholder="sensor.xxx"/>
        </div>

        <div class="row">
          <label>Widget 4 entity</label>
          <input id="e4" value="${e(c.entity_4)}" placeholder="binary_sensor.xxx"/>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById("room_theme").value = c.room_theme ?? "living_room";

    const onChange = () => {
      const mk = (id) => {
        const v = this._val(id).trim();
        return v ? { entity_id: v } : undefined;
      };

      this._emit({
        ...c,
        type: "custom:room-card",
        name: this._val("name") || undefined,
        icon: this._val("icon") || undefined,
        room_theme: this._val("room_theme") || "living_room",
        entity_1: mk("e1"),
        entity_2: mk("e2"),
        entity_3: mk("e3"),
        entity_4: mk("e4"),
      });
    };

    this.shadowRoot.querySelectorAll("input,select").forEach((el) => {
      el.addEventListener("change", onChange);
      el.addEventListener("input", onChange);
    });
  }
}

customElements.define("room-card-editor", RoomCardEditor);
