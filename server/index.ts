/**
 * Production server entry point.
 *
 * Started by App Service with the command declared in
 * APPLICATION_PACKAGE.startCommand. This is not the Vite dev server and does not
 * import it.
 *
 * Startup and shutdown are the parts that decide whether a deployment is
 * diagnosable. A configuration fault exits non zero before binding, so App Service
 * reports a failed start rather than a site that answers nothing. A termination
 * signal stops accepting connections and lets in flight requests finish, so a
 * restart or a scale event does not truncate a response mid stream.
 */

import { createServer } from 'node:http';

import { createApp } from './createApp.js';
import { loadServerConfig } from './serverConfig.js';

/** Signals App Service and container runtimes use to ask for a clean stop. */
const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;

/**
 * How long in flight requests may take to finish before the process exits
 * regardless. App Service allows a limited grace period, so waiting indefinitely
 * would turn a clean shutdown into a forced kill with no log line.
 */
export const SHUTDOWN_GRACE_MS = 10_000;

const EXIT_CODE = {
  ok: 0,
  startupFailure: 1,
} as const;

async function main(): Promise<void> {
  const config = loadServerConfig();
  const server = createServer(createApp(config));

  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    process.stdout.write(`received ${signal}, closing after in flight requests\n`);

    const forceExit = setTimeout(() => {
      process.stdout.write('grace period elapsed, exiting with requests still open\n');
      process.exit(EXIT_CODE.ok);
    }, SHUTDOWN_GRACE_MS);
    forceExit.unref();

    server.close(() => {
      clearTimeout(forceExit);
      process.exit(EXIT_CODE.ok);
    });
  };

  for (const signal of SHUTDOWN_SIGNALS) {
    process.on(signal, () => shutdown(signal));
  }

  // An unhandled rejection is logged and the process keeps serving.
  //
  // This deliberately does not shut down. Shutting down here meant a single
  // malformed request could terminate an instance that was healthy for every other
  // user, which converts a request level bug into an availability incident. Request
  // level failures are handled inside the listener and answered with a status code.
  // If a rejection still reaches here it is a defect to fix, and the log line plus
  // Application Insights is how it gets found.
  process.on('unhandledRejection', (reason) => {
    process.stderr.write(`unhandled rejection, continuing to serve: ${String(reason)}\n`);
  });

  // An uncaught exception is different. The process state is unknown at that point,
  // so draining and letting App Service restart the instance is safer than serving
  // from it.
  process.on('uncaughtException', (error) => {
    process.stderr.write(`uncaught exception: ${error.message}\n`);
    shutdown('uncaughtException');
  });

  await new Promise<void>((settle, reject) => {
    server.once('error', reject);
    server.listen(config.port, () => {
      server.removeListener('error', reject);
      settle();
    });
  });

  // Port and mode only. Paths and service hosts are deliberately not logged.
  process.stdout.write(
    `server listening on port ${config.port} in ${config.isProduction ? 'production' : 'development'} mode\n`,
  );
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `server failed to start: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(EXIT_CODE.startupFailure);
}
