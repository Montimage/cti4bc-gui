# Build stage
FROM node:18-alpine AS build-stage

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --legacy-peer-deps

ARG REACT_APP_CERTSYNC_TRAINING_ENABLED=false
ENV REACT_APP_CERTSYNC_TRAINING_ENABLED=$REACT_APP_CERTSYNC_TRAINING_ENABLED

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY . .

RUN npm run build

# Production stage
FROM nginx:1.21-alpine

COPY --from=build-stage /usr/src/app/build /usr/share/nginx/html

# Copy the custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-certsync-training.sh /docker-entrypoint.d/40-certsync-training.sh
RUN chmod +x /docker-entrypoint.d/40-certsync-training.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]