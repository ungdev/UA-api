# The normal version is used to debug easily
FROM node:15

ENV NODE_ENV=production
WORKDIR /srv/app

RUN chown node:node .

USER node

# Node has the uid 1000
COPY --chown=node:node package.json yarn.lock schema.prisma ./

RUN yarn --frozen-lockfile

COPY --chown=node:node ./ ./

RUN yarn openapi:build
RUN yarn prisma generate
RUN yarn build

CMD yarn start