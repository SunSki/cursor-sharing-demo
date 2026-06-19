#!/bin/bash
set -e

if [ -z "$RENDER_API_KEY" ]; then
  echo "Error: RENDER_API_KEY is not set"
  exit 1
fi

echo "Fetching owner ID..."
OWNER_RESP=$(curl -s "https://api.render.com/v1/owners?limit=1" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Accept: application/json")

OWNER_ID=$(echo "$OWNER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['owner']['id'])")
OWNER_NAME=$(echo "$OWNER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['owner']['name'])")
echo "Owner: $OWNER_NAME ($OWNER_ID)"

echo "Creating web service..."
SERVICE_RESP=$(curl -s -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"web_service\",
    \"name\": \"cursor-sharing-demo\",
    \"ownerId\": \"$OWNER_ID\",
    \"repo\": \"https://github.com/SunSki/cursor-sharing-demo\",
    \"branch\": \"master\",
    \"serviceDetails\": {
      \"env\": \"node\",
      \"plan\": \"free\",
      \"region\": \"oregon\",
      \"envSpecificDetails\": {
        \"buildCommand\": \"npm install\",
        \"startCommand\": \"node server.js\"
      }
    }
  }")

SERVICE_ID=$(echo "$SERVICE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['service']['id'])")
SERVICE_URL=$(echo "$SERVICE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['service']['serviceDetails']['url'])")

echo ""
echo "✓ Service created! Deploy in progress (1-3 min)."
echo "  URL:       $SERVICE_URL"
echo "  Dashboard: https://dashboard.render.com/web/$SERVICE_ID"
