FROM node:13-alpine

WORKDIR /srv

COPY package.json yarn.lock ./
RUN yarn --non-interactive --prod

ENV NODE_ENV=production

COPY . .

RUN yarn build

CMD yarn start