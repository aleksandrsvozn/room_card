class RoomCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  _render() {
    const c = this._config || {};
    this.shadowRoot.innerHTML = `
      <style>
        .c { display:grid; gap:12px; }
        input, select { width:100%; padding:6px; }
        label { font-size:12px; opacity:0.8; }
      </style>

      <div class="c">
        <label>Name<input id="name" value="${c.name ?? ""}"></label>
        <label>Icon<input id="icon" value="${c.icon ?? ""}" placeholder="mdi:laptop"></label>
        <label>Theme
          <select id="theme">
            <option value="living_room">living_room</option>
            <option value="office">office</option>
          </select>
        </label>

        <label>Widget 1<input id="e1" value="${c.entity_1?.entity_id ?? ""}"></label>
        <label>Widget 2<input id="e2" value="${c.entity_2?.entity_id ?? ""}"></label>
        <label>Widget 3<input id="e3" value="${c.entity_3?.entity_id ?? ""}"></label>
        <label>Widget 4<input id="e4" value="${c.entity_4?.entity_id ?? ""}"></label>
      </div>
    `;

    this.shadowRoot.getElementById("theme").value = c.room_theme ?? "living_room";

    this.shadowRoot.querySelectorAll("input,select").forEach((el) =>
      el.addEventListener("change", () => {
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: {
              config: {
                type: "custom:room-card",
                name: this.shadowRoot.getElementById("name").value || undefined,
                icon: this.shadowRoot.getElementById("icon").value || undefined,
                room_theme: this.shadowRoot.getElementById("theme").value,
                entity_1: this.shadowRoot.getElementById("e1").value
                  ? { entity_id: this.shadowRoot.getElementById("e1").value }
                  : undefined,
                entity_2: this.shadowRoot.getElementById("e2").value
                  ? { entity_id: this.shadowRoot.getElementById("e2").value }
                  : undefined,
                entity_3: this.shadowRoot.getElementById("e3").value
                  ? { entity_id: this.shadowRoot.getElementById("e3").value }
                  : undefined,
                entity_4: this.shadowRoot.getElementById("e4").value
                  ? { entity_id: this.shadowRoot.getElementById("e4").value }
                  : undefined,
              },
            },
            bubbles: true,
            composed: true,
          })
        );
      })
    );
  }
}

customElements.define("room-card-editor", RoomCardEditor);
