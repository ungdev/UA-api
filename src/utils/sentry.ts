import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { RewriteFrames } from '@sentry/integrations';
import { Express } from 'express';
import { isProductionDatabase, sentryUrl } from './environment';

// Types used by sentry
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      __rootdir__: string;
    }
  }
}

// eslint-disable-next-line no-underscore-dangle
global.__rootdir__ = __dirname || process.cwd();

const integrations = [
  new RewriteFrames({
    // eslint-disable-next-line no-underscore-dangle
    root: global.__rootdir__,
  }),
];

export const initSentryExpress = (app: Express) => {
  Sentry.init({
    dsn: sentryUrl(),
    environment: isProductionDatabase() ? 'production' : 'staging',
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Tracing.Integrations.Express({ app }),
      ...integrations,
    ],

    tracesSampleRate: 1,
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
};

export const initSentryNode = () => {
  Sentry.init({
    dsn: sentryUrl(),
    environment: isProductionDatabase() ? 'production' : 'staging',
    integrations,

    tracesSampleRate: 1,
  });
};
