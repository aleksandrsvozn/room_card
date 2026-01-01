# Room Card (Lovelace)

Кастомная Lovelace карточка для Home Assistant: отображает список сущностей одним блоком (например, для комнаты).

## Установка через HACS
1. HACS → Frontend
2. Custom repositories → Add
3. Укажи URL репозитория, Category: **Lovelace**
4. Install

## Подключение ресурса (один раз)
Settings → Dashboards → Resources → Add resource:
- URL: `/hacsfiles/room-card/room-card.js`
- Type: `module`

Перезагрузи страницу (Ctrl+F5).

## Использование (YAML)
```yaml
type: custom:room-card
title: Гостиная
entities:
  - sensor.livingroom_temperature
  - sensor.livingroom_humidity
  - binary_sensor.livingroom_motion
show_icon: true
show_state_badge: true
secondary_info: last_changed
