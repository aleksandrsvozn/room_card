"""Room Card integration (frontend wrapper)."""

from __future__ import annotations

from pathlib import Path

DOMAIN = "room_card"


async def async_setup(hass, config):
    """Set up the integration and expose frontend files."""
    www_dir = Path(__file__).parent / "www"

    # Expose:
    #   /local/room-card/room-card.js
    #   /local/room-card/room-card-editor.js
    # Important: this works even if files are not in /config/www
    hass.http.register_static_path(
        "/local/room-card",
        str(www_dir),
        cache_headers=False,
    )

    return True
