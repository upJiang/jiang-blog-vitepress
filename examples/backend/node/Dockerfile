FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile --non-interactive
COPY tsconfig.json jest.config.cjs prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN yarn prisma:generate
RUN yarn build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --production --frozen-lockfile --non-interactive && yarn cache clean
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
