export interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let pending: InstallPrompt | null = null;
const listeners = new Set<(event: InstallPrompt | null) => void>();
export const getInstallPrompt = () => pending;
export function clearInstallPrompt() {
  pending = null;
  for (const notify of listeners) notify(null);
}
export function subscribeInstallPrompt(
  notify: (event: InstallPrompt | null) => void,
) {
  listeners.add(notify);
  notify(pending);
  return () => {
    listeners.delete(notify);
  };
}
// Capture this before sign-in, so the authenticated header can use a prompt
// the browser offered while the login page was still visible.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  pending = event as InstallPrompt;
  for (const notify of listeners) notify(pending);
});
window.addEventListener("appinstalled", clearInstallPrompt);
