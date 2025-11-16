FROM node:22

# Alpine has been disabled due to issues with the Sentry SDK
# FROM node:20-alpine

# Install build dependencies for Alpine
# RUN apk add --no-cache --virtual .build-deps \
#     python3 \
#     make \
#     g++

WORKDIR /app

COPY package.json package-lock.json* ./

COPY prisma ./prisma/

# Delete package-lock and do a clean install
RUN rm -f package-lock.json && \
    npm install --legacy-peer-deps

RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Build worker
RUN npm run worker:build

# Remove build dependencies to reduce image size | Required for Alpine
# RUN apk del .build-deps