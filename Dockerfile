FROM node:16

ENV NODE_ENV=production
WORKDIR /srv/app

RUN chown node:node .

USER node

# Node has the uid 1000
COPY --chown=node:node package.json yarn.lock schema.prisma ./

RUN yarn --frozen-lockfile --production=false --network-timeout 1000000

COPY --chown=node:node ./ ./

RUN yarn prisma generate
RUN yarn build

# Prunes devDependencies
RUN yarn install --production --ignore-scripts --prefer-offline --network-timeout 1000000

CMD yarn start