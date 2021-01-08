# UA-api

[![Build Status](https://travis-ci.com/ungdev/UA-api.svg?branch=master)](https://travis-ci.com/ungdev/UA-api)
[![codecov](https://codecov.io/gh/ungdev/UA-API/branch/master/graph/badge.svg)](https://codecov.io/gh/ungdev/UA-API)

API web à destination des services de l'UTT Arena

## Requirements

- [Node.js](https://nodejs.org/)
- [yarn](https://yarnpkg.com/)

## Installation

```
git clone git@github.com:ungdev/UA-api.git
# or
git clone https://github.com/ungdev/UA-api.git

cd UA-api

# Install all the dependencies
yarn
```

Then, connect to your database (MySQL/MariaDB) and enter

```
CREATE DATABASE arena CHARACTER SET utf8;
```

Create the tables and populate them with

```
mysql -u DATABASE_USER -p arena < seed.sql
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

Use `npx prisma generate` to generate your prisma client

## How to test

- Change `DATABASE_NAME` in `.env` with your testing database name

- Seed the database before testing with `mysql -u DATABASE_USER -p DATABASE_NAME < seed.sql` by replacing `DATABASE_USER` and `DATABASE_NAME` with their values

- Run `yarn test`

Create a `local/test.sh` file and put the following content

```bash
#!/bin/bash -e

# Create the database
mysql -e "DROP DATABASE IF EXISTS arenatest"
mysql -e "CREATE DATABASE arenatest CHARACTER SET utf8"

mysql arenatest < seed.sql

# Set your correct environnment variables
export DATABASE_NAME=arenatest
export DATBASE_USERNAME=root
export DATBASE_PASSWORD=root

# Starts the testing
yarn test
```

you can then

```bash
chmod +x local/test.sh
./local/test.sh # Happy testing !
```
