#!/bin/bash
# Astrum Developer Workflow Script
# Usage: ./dev.sh [command]
#
#   ./dev.sh          → Start live dev server (Tauri desktop, hot reload)
#   ./dev.sh mac      → Build & install macOS .app
#   ./dev.sh ios      → Sync to iOS and open Xcode
#   ./dev.sh build    → Build web assets only

set -e
source ~/.nvm/nvm.sh 2>/dev/null && nvm use --lts --silent 2>/dev/null || true

CMD="${1:-dev}"

case "$CMD" in
  dev)
    echo "▶ Starting Astrum dev server (Tauri + hot reload)…"
    echo "  Edit src/App.jsx and changes appear instantly."
    echo "  Press Ctrl+C to stop."
    echo ""
    npm run tauri dev
    ;;

  mac)
    echo "▶ Building Astrum for macOS…"
    npm run tauri build
    APP="src-tauri/target/release/bundle/macos/Astrum.app"
    DMG=$(ls src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null | head -1)
    echo ""
    echo "✓ Build complete."
    if [ -f "$DMG" ]; then
      echo "  DMG: $DMG"
      echo ""
      echo "  To install: open the DMG and drag Astrum to /Applications"
      open "$(dirname "$DMG")"
    elif [ -d "$APP" ]; then
      echo "  App: $APP"
      open "$(dirname "$APP")"
    fi
    ;;

  ios)
    echo "▶ Building web assets and syncing to iOS…"
    npm run build
    npx cap sync ios
    echo ""
    echo "✓ Sync complete. Opening Xcode…"
    echo "  In Xcode: select your device/simulator → press ▶ to run."
    echo "  For device: select your iPhone in the device list and trust the developer cert."
    npx cap open ios
    ;;

  build)
    echo "▶ Building web assets…"
    npm run build
    echo "✓ Done. dist/ is ready."
    ;;

  *)
    echo "Usage: ./dev.sh [dev|mac|ios|build]"
    exit 1
    ;;
esac
