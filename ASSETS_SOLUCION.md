# ✅ HOST DE REEMPLAZO ENCONTRADO

El autor original (Vexcited) tiene su app **viva** en `https://lofi.vexcited.com`
y **auto-hostea el set completo** en:

```
https://lofi.vexcited.com/large/
```

Con la MISMA estructura de carpetas que tu app. Es reemplazo casi 1:1 del
host muerto `lofi-co-assets.vexcited.com`.

## Mapeo de rutas
| Tu app (muerto) | Reemplazo vivo |
|---|---|
| `lofi-co-assets.vexcited.com/scenes/`     | `lofi.vexcited.com/large/scenes/` |
| `lofi-co-assets.vexcited.com/effects/`    | `lofi.vexcited.com/large/effects/` |
| `lofi-co-assets.vexcited.com/wallpapers/` | `lofi.vexcited.com/large/wallpapers/` |
| `lofi-co-assets.vexcited.com/ogtracks/`   | `lofi.vexcited.com/large/ogtracks/` |

## Cobertura verificada (testeada URL por URL)
| Tipo | Funcionan | Detalle |
|------|-----------|---------|
| 🎥 Videos | **151 / 159** | Solo falla la escena `chill-vibes` (8 archivos, 404) |
| 🔊 Efectos | **18 / 18** ✅ | TODOS, incluidos deepspace/fan/river/snow/wind/etc |
| 🎵 Tracks música | **✅ todos** | chill/jazzy/sleepy |
| 🖼️ Wallpapers | **4 / 26** | Los renombraron en el mirror nuevo → hay que remapear (baja prioridad: son solo poster de fondo detrás del video) |

## Lo único que falta de verdad
1. **Escena `chill-vibes`** (8 videos) — no está en este mirror. Se puede:
   - dejar oculta, o
   - tomarla del otro mirror `ItzAshOffcl/lofi-resources` (tiene chill-vibes con nombres simples day/night/day-rain/night-rain, ya bajado en `./lofi-resources/`).
2. **22 wallpapers** con nombre viejo — existen en el mirror nuevo pero
   renombrados (`artroom/artroom.jpg`, `cottage/exterior.png`, etc.).
   Son cosméticos (fallback detrás del video). Remapeables si querés el 100%.

## Fix directo (cuando quieras)
Cambiar en `src/assets/data/scenes.data.js` y `src/assets/data/audios.data.js`:
```
https://lofi-co-assets.vexcited.com   →   https://lofi.vexcited.com/large
```
Eso solo ya prende 151 videos + 18 efectos + toda la música.
Mejor aún: meterlo en `REACT_APP_ASSETS_URL` (.env) para no hardcodear.
