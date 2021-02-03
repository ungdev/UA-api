FROM node:15-alpine

ENV NODE_ENV=production
WORKDIR /opt

RUN chown node:node .

USER node

COPY package.json yarn.lock schema.prisma ./

RUN yarn --frozen-lockfile

COPY ./ ./

RUN yarn openapi:build
RUN yarn build

CMD yarn start