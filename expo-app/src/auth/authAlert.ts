import { showAppAlert } from '../lib/appAlert';

/** Alerts that work on native and in the browser (RN `Alert` is unreliable on web). */
export function authAlert(title: string, message?: string) {
  showAppAlert(title, message, [{ text: 'OK' }]);
}
