# UA-api

[![Build Status](https://github.com/ungdev/UA-api/actions/workflows/ci.yml/badge.svg)](https://github.com/ungdev/UA-api/actions)
[![codecov](https://codecov.io/gh/ungdev/UA-API/branch/master/graph/badge.svg)](https://codecov.io/gh/ungdev/UA-API)
[![Read the Docs](https://readthedocs.org/projects/ua/badge/?version=latest&style=flat)](https://ua.readthedocs.io/)

API web à destination des services de l'UTT Arena

**Avant toute chose**, prenez connaissance de [la documentation](https://ua.readthedocs.io).

## Requirements

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)

## Installation

```
git clone git@github.com:ungdev/UA-api.git
# or
git clone https://github.com/ungdev/UA-api.git

cd UA-api

# Install all the dependencies
pnpm install

# Copy the file .env.example to .env

cp .env.example .env

# Then, edit the variable DATABASE_URL in the file .env
```

Then, connect to your database (MySQL/MariaDB) and enter

```
CREATE DATABASE arena CHARACTER SET utf8;
```

Create the tables

```
pnpm prisma db push
```

Populate the tables

```
mysql -u DATABASE_USER -p arena --protocol tcp < seed.sql
```

Generate the prisma client (redo this command when you update schema.prisma)

```
pnpm prisma generate
```

## Configuration

Edit the file .env with your values

## Commands

```
pnpm dev       # start development server
pnpm build     # builds the typescript to javascript
pnpm start     # start production server
pnpm lint      # checks if the code is correct
pnpm lint-fix  # try to fix lint errors and warnings
pnpm fake      # populate the database with fake data
```

## Prisma config

Use `npx prisma generate` to generate your prisma client

## How to test

The tests must be able to run without any environment variables except the database

### Change the database for tests

Create a new `.env.test` file that will override values from `.env` :

```
cp .env.test.example .env.test
```

Change the database name to `arena_test`. Change the credentials too, like in the `.env` file.

Open MySQL/MariaDB, and run the following command to create the database :

```
CREATE DATABASE arena_test CHARACTER SET utf8;
```

Then, come back to your terminal :

```
# Push the schema to the database :
pnpm test:schema:push

# Seed the database :
mysql -u DATABASE_USER -p arena --protocol tcp < seed.sql
```

### Run the tests

```
pnpm test
```

# Documentation

We build the documentation with Sphinx based on markdown. If you want to compile the documentation on your local PC, you will need to have `Python 3` and then type the following commands:

```
cd docs
pip3 install -r requirements.txt
make html
```

It will create a `build` folder where the doc is located
