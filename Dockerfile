FROM node:20-alpine AS builder

WORKDIR /app

# The TypeScript SDK requires its own dependencies and a build to link correctly, 
# but NPM workspaces or linked local files can resolve this natively.
COPY zirve-sdk/typescript ./zirve-sdk/typescript
COPY zirve-pilot-node ./zirve-pilot-node

# We must build the SDK first so the dist/ folder is available for the pilot
WORKDIR /app/zirve-sdk/typescript
RUN npm install && npm run build

WORKDIR /app/zirve-pilot-node
RUN npm install
RUN npm run build

FROM node:20-alpine
WORKDIR /app
# Copy the built SDK and its node_modules
COPY --from=builder /app/zirve-sdk/typescript /app/zirve-sdk/typescript
# Copy the pilot app
COPY --from=builder /app/zirve-pilot-node /app/zirve-pilot-node

WORKDIR /app/zirve-pilot-node
EXPOSE 8080
CMD ["node", "dist/index.js"]
