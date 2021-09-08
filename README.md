# UA-api

[![Build Status](https://github.com/ungdev/UA-api/actions/workflows/ci.yml/badge.svg)](https://github.com/ungdev/UA-api/actions)
[![codecov](https://codecov.io/gh/ungdev/UA-API/branch/master/graph/badge.svg)](https://codecov.io/gh/ungdev/UA-API)
[![Read the Docs](https://readthedocs.org/projects/ua-api/badge/?version=latest&style=flat)](https://ua-api.readthedocs.io/)

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

Create the tables

```
yarn prisma db push
```

Populate the tables

```
mysql -u DATABASE_USER -p arena --protocol tcp < seed.sql
```

Generate the prisma client (redo this command when you update schema.prisma)

```
yarn prisma generate
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

The tests must be able to run without any environment variables except the database

# Documentation

We build the documentation with Sphinx based on markdown. If you want to compile the documentation on your local PC, you will need to have `Python 3` and then type the following commands:

```
cd docs
pip3 install -r requirements.txt
make html
```

It will create a `build` folder where the doc is located
