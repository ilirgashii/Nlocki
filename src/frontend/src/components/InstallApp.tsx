import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type InstallPrompt,
  clearInstallPrompt,
  getInstallPrompt,
  subscribeInstallPrompt,
} from "../lib/install-prompt";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(getInstallPrompt);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const update = () =>
      setInstalled(
        standalone.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    update();
    const unsubscribe = subscribeInstallPrompt(setPrompt);
    const done = () => {
      setInstalled(true);
      setOpen(false);
      setPrompt(null);
    };

    window.addEventListener("appinstalled", done);
    standalone.addEventListener("change", update);
    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", done);
      standalone.removeEventListener("change", update);
    };
  }, []);
  if (installed) return null;
  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Install Nlocki app"
        onClick={() => setOpen(true)}
      >
        <Download className="w-4 h-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Nlocki</DialogTitle>
            <DialogDescription>
              Add Nlocki to your home screen. It connects to this same server
              after you sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <img
                src="/icons/icon-192.png"
                alt="Nlocki app icon"
                className="w-14 h-14 rounded-2xl"
              />
              <p className="font-semibold">
                Nlocki · Fitness, nutrition & daily plans
              </p>
            </div>
            {prompt && (
              <Button
                onClick={async () => {
                  const pending = prompt;
                  clearInstallPrompt();
                  try {
                    await pending.prompt();
                    await pending.userChoice;
                  } catch {
                    setError(
                      "Open your browser menu and choose Install app instead.",
                    );
                  }
                }}
              >
                Install app
              </Button>
            )}
            <p>
              <strong>Android / Chrome:</strong> Open the browser menu and
              choose Install app or Add to Home screen. The exact option depends
              on your browser.
            </p>
            <p>
              <strong>iPhone / iPad:</strong> Open this site in Safari, tap
              Share, choose Add to Home Screen, then Add.
            </p>
            <p className="text-muted-foreground">
              For phones, use the deployed HTTPS address. Your accounts, posts
              and stats stay on the server. An Internet connection is required
              to view and save account data. This is a web app installation; it
              is not an App Store or Google Play download.
            </p>
            {error && <p className="text-destructive">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
