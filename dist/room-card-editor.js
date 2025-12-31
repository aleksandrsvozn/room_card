class EcRoomCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    if (!this.attachShadow) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  _value(id) {
    return this.shadowRoot.getElementById(id)?.value ?? "";
  }

  _fireChanged(newCfg) {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: newCfg },
      bubbles: true,
      composed: true
    }));
  }

  _render() {
    const c = this._config || {};
    this.shadowRoot.innerHTML = `
      <style>
        .c{display:grid; gap:12px}
        input, select { width:100%; padding:8px; }
        label{font-size:12px; opacity:.8}
      </style>
      <div class="c">
        <div>
          <label>Name</label>
          <input id="name" value="${c.name ?? ""}" placeholder="Офис" />
        </div>
        <div>
          <label>Icon (mdi:...)</label>
          <input id="icon" value="${c.icon ?? ""}" placeholder="mdi:laptop" />
        </div>
        <div>
          <label>Room theme</label>
          <select id="room_theme">
            <option value="living_room" ${c.room_theme==="living_room"?"selected":""}>living_room</option>
            <option value="office" ${c.room_theme==="office"?"selected":""}>office</option>
          </select>
        </div>

        <div>
          <label>Widget 1 entity</label>
          <input id="e1" value="${c.entity_1?.entity_id ?? c.entity_1?.entity ?? ""}" placeholder="light.xxx" />
        </div>
        <div>
          <label>Widget 2 entity</label>
          <input id="e2" value="${c.entity_2?.entity_id ?? c.entity_2?.entity ?? ""}" placeholder="switch.xxx" />
        </div>
        <div>
          <label>Widget 3 entity</label>
          <input id="e3" value="${c.entity_3?.entity_id ?? c.entity_3?.entity ?? ""}" placeholder="sensor.xxx" />
        </div>
        <div>
          <label>Widget 4 entity</label>
          <input id="e4" value="${c.entity_4?.entity_id ?? c.entity_4?.entity ?? ""}" placeholder="binary_sensor.xxx" />
        </div>
      </div>
    `;

    const onChange = () => {
      const cfg = {
        ...c,
        name: this._value("name") || undefined,
        icon: this._value("icon") || undefined,
        room_theme: this._value("room_theme") || "living_room",
        entity_1: this._value("e1") ? { entity_id: this._value("e1") } : undefined,
        entity_2: this._value("e2") ? { entity_id: this._value("e2") } : undefined,
        entity_3: this._value("e3") ? { entity_id: this._value("e3") } : undefined,
        entity_4: this._value("e4") ? { entity_id: this._value("e4") } : undefined,
        type: "custom:room-card"
      };
      this._fireChanged(cfg);
    };

    this.shadowRoot.querySelectorAll("input,select").forEach((x) => x.addEventListener("change", onChange));
  }
}

customElements.define("room-card-editor", EcRoomCardEditor);
