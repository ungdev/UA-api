FROM node:18

ENV NODE_ENV=production
WORKDIR /srv/app

RUN npm install -g pnpm

RUN chown node:node .

USER node

# Node has the uid 1000
COPY --chown=node:node package.json pnpm-lock.yaml schema.prisma ./

RUN pnpm install --frozen-lockfile --production=false

COPY --chown=node:node ./ ./

RUN pnpm pnpx prisma generate
RUN pnpm build

# Prunes devDependencies
RUN pnpm install --production --ignore-scripts --prefer-offline

CMD pnpm start