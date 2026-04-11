#!/bin/sh
# Write ngrok 2.x config with auth token
mkdir -p "$HOME/.ngrok2"
cat > "$HOME/.ngrok2/ngrok.yml" << YMLEOF
authtoken: ${NGROK_AUTHTOKEN}
YMLEOF
echo "✓ ngrok config written"

# Start Expo with tunnel
EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN \
EXPO_PUBLIC_REPL_ID=$REPL_ID \
pnpm exec expo start --tunnel --port $PORT
