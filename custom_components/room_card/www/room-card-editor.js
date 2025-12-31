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
    const ent = (x) => (x && typeof x === "object" ? (x.entity_id ?? x.entity ?? "") : (x ?? ""));

    this.shadowRoot.innerHTML = `
      <style>
        .wrap{display:grid;gap:12px}
        label{font-size:12px;opacity:.8}
        input,select{padding:8px;width:100%;box-sizing:border-box}
      </style>
      <div class="wrap">
        <div><label>Name</label><input id="name" value="${c.name ?? ""}" placeholder="Office"></div>
        <div><label>Icon (mdi:...)</label><input id="icon" value="${c.icon ?? ""}" placeholder="mdi:laptop"></div>
        <div>
          <label>Theme</label>
          <select id="theme">
            <option value="living_room">living_room</option>
            <option value="office">office</option>
          </select>
        </div>
        <div><label>Widget 1 entity</label><input id="e1" value="${ent(c.entity_1)}" placeholder="light.xxx"></div>
        <div><label>Widget 2 entity</label><input id="e2" value="${ent(c.entity_2)}" placeholder="switch.xxx"></div>
        <div><label>Widget 3 entity</label><input id="e3" value="${ent(c.entity_3)}" placeholder="sensor.xxx"></div>
        <div><label>Widget 4 entity</label><input id="e4" value="${ent(c.entity_4)}" placeholder="binary_sensor.xxx"></div>
      </div>
    `;

    this.shadowRoot.getElementById("theme").value = c.room_theme ?? "living_room";

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
        room_theme: this._val("theme") || "living_room",
        entity_1: mk("e1"),
        entity_2: mk("e2"),
        entity_3: mk("e3"),
        entity_4: mk("e4"),
      });
    };

    this.shadowRoot.querySelectorAll("input,select").forEach((el) => {
      el.addEventListener("input", onChange);
      el.addEventListener("change", onChange);
    });
  }
}

customElements.define("room-card-editor", RoomCardEditor);
