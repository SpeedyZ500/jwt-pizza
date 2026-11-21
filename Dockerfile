
# Stage 1: Build the Vite application
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_MODE=kubernetes
RUN npm run build -- --mode "$VITE_MODE"

# Stage 2: Serve using Nginx
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
