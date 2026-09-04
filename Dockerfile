# ─────────────────────────────────────────────────────────────
#  Пульт наблюдения «Допросная №2» · Ростелеком Видеонаблюдение
#  Двухступенчатая сборка: Vite-build → nginx
# ─────────────────────────────────────────────────────────────

# ---- ступень 1: сборка фронтенда ----
FROM node:20-alpine AS build

WORKDIR /app

# vite/tailwind/typescript находятся в devDependencies —
# принудительно остаёмся в dev-режиме и показываем предупреждения npm
ENV NODE_ENV=development \
    npm_config_audit=false \
    npm_config_fund=false \
    npm_config_loglevel=warn

# сначала зависимости — слой будет переиспользоваться, пока package.json не менялся
COPY package.json package-lock.json* ./
RUN npm ci --include=dev || npm install --include=dev

# Страховка: если сборочного инструментария не оказалось в package.json
# (например, devDependencies не попали в копию проекта), ставим его явно
RUN if [ ! -x node_modules/.bin/vite ]; then \
      echo ">> vite не найден после установки — ставлю инструментарий явно"; \
      npm install --no-save --include=dev \
        vite@6.4.3 \
        @vitejs/plugin-react@4.3.4 \
        typescript@5.7.3 \
        tailwindcss@4.1.7 \
        @tailwindcss/vite@4.1.7; \
    fi; \
    node_modules/.bin/vite --version

# исходники (копируем всё, лишнее отсекает .dockerignore)
COPY . .

RUN npm run build

# ---- ступень 2: раздача статики ----
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
