# UA-api

API web à destination des services de l'UTT Arena

## Requirements

- [Node.js](https://nodejs.org/) (_LTS Version prefered_)
- [yarn](https://yarnpkg.com/)

## Installation

```
git clone git@github.com:ungdev/UA-api.git
# or
git clone https://github.com/ungdev/UA-api.git

cd UA-api

# Install all the depedencies
yarn
```

Then, connect to your database (MySQL/MariaDB) and enter

```
CREATE DATABASE arena CHARACTER SET utf8;
```

Create the tables and populate them with

```
mysql -u USERNAME -p arena < seed.sql
```

## Configuration

Copy the file .env.example to .env and then edit it with your values :

```
cp .env.example .env
```

## Commands

```
yarn dev       # start development server
yarn build     # builds the typescript to javascript
yarn start     # start production server
yarn lint      # checks if the code is correct
yarn lint-fix  # try to fix lint errors and warnings
yarn api-check # checks if openapi.yml is correct
```

## Prisma config

Before use `npx prisma generate` to regenerate your prisma client add `prisma/.env` with `DATABASE_URL`
