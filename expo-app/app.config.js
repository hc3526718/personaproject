/* eslint-disable @typescript-eslint/no-require-imports */
const appJson = require('./app.json');

/**
 * When deploying the web export under a subpath (e.g. /app on Vercel), set:
 *   EXPO_WEB_BASE_PATH=/app
 * Leave unset for local `expo start --web` and root hosting.
 */
module.exports = () => {
  const baseUrl = (process.env.EXPO_WEB_BASE_PATH || '').trim();
  const expo = { ...appJson.expo };
  if (baseUrl) {
    expo.experiments = { ...(expo.experiments || {}), baseUrl };
  }
  return { expo };
};
