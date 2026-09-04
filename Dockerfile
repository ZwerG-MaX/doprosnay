# ─────────────────────────────────────────────────────────────
#  Пульт наблюдения «Допросная №2» · Ростелеком Видеонаблюдение
#  Двухступенчатая сборка: Vite-build → nginx
# ─────────────────────────────────────────────────────────────

# ---- ступень 1: сборка фронтенда ----
FROM node:20-alpine AS build

WORKDIR /app

# сначала зависимости — слой будет переиспользоваться, пока package.json не менялся
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# затем исходники и сборка
COPY index.html tsconfig.json vite.config.js ./
COPY src ./src
RUN npm run build

# ---- ступень 2: раздача статики ----
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
