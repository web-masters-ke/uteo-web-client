#!/bin/sh
set -e

if [ -n "$NEXT_PUBLIC_API_URL" ]; then
  find /app/.next -name "*.js" \
    -exec sed -i "s|NEXT_PUBLIC_API_URL_PLACEHOLDER|${NEXT_PUBLIC_API_URL}|g" {} +
fi

if [ -n "$NEXT_PUBLIC_WS_URL" ]; then
  find /app/.next -name "*.js" \
    -exec sed -i "s|NEXT_PUBLIC_WS_URL_PLACEHOLDER|${NEXT_PUBLIC_WS_URL}|g" {} +
fi

if [ -n "$NEXT_PUBLIC_JAAS_APP_ID" ]; then
  find /app/.next -name "*.js" \
    -exec sed -i "s|NEXT_PUBLIC_JAAS_APP_ID_PLACEHOLDER|${NEXT_PUBLIC_JAAS_APP_ID}|g" {} +
fi

exec node server.js
