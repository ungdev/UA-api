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

# Installs all the depedencies
yarn
```

Then, connect to your database (MySQL/MariaDB) and enter

```
CREATE DATABASE arena CHARACTER SET utf8;
```

Create the tables with

```
yarn seed
```

## Configuration

```
# copy env file for all environments
cp .env.example .env
# makes your changes in .env, which will not be pushed
nano .env
```

## Commands

```
yarn dev       # development server
yarn build     # builds the typescript to javascript
yarn start     # production server
yarn lint      # checks if the code is correct
yarn api-check # checks if openapi.yml is correct
```

## Sidenote about package.json
We don't update winston to the latest version due to this bug https://github.com/winstonjs/winston/issues/1338