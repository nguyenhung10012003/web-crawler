FROM node:20-alpine AS base

ENV YARN_VERSION 4.6.0

RUN apk update && apk upgrade && apk add --no-cache libc6-compat && apk add dumb-init
RUN corepack enable && corepack prepare yarn@${YARN_VERSION}

FROM base AS builder
WORKDIR /app

COPY . .
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable
RUN yarn build

FROM base AS prod
ENV NODE_ENV production

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable
COPY --from=builder /app/dist dist

ENV PORT 8080
EXPOSE 8080
CMD ["yarn", "run", "start"]
