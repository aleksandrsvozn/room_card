from __future__ import annotations

from pathlib import Path

DOMAIN = "room_card"
STATIC_URL = "/local/room-card"


def _register_static(hass) -> None:
    www_dir = Path(__file__).parent / "www"

    hass.http.async_register_static_paths(
        [
            {
                "url_path": STATIC_URL,
                "path": str(www_dir),
                "cache_headers": False,
            }
        ]
    )


async def async_setup(hass, config):
    _register_static(hass)
    return True


async def async_setup_entry(hass, entry):
    _register_static(hass)
    return True
