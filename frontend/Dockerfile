# ---------- Build stage ----------
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@8.6.12 --activate

WORKDIR /app

COPY package.json ./
RUN pnpm install

COPY . .

ENV NODE_OPTIONS=--max-old-space-size=4096

RUN pnpm run build


# ---------- Production stage ----------
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
