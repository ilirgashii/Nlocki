import { Download, ShieldCheck } from "lucide-react";
import { useInternetIdentity } from "../hooks/use-auth";
import { Button } from "./ui/button";
export function RecoveryCodes() {
  const { recoveryCodes, dismissRecoveryCodes } = useInternetIdentity();
  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [
          `Nlock'i recovery codes\nKeep offline. Each code works once; your Internet Identity is also required.\n\n${recoveryCodes.join("\n")}\n`,
        ],
        { type: "text/plain" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "nlocki-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <section className="max-w-md w-full space-y-5 border bg-card rounded-3xl p-8 shadow-lg">
        <ShieldCheck className="text-emerald-500 h-10 w-10" />
        <h1 className="text-2xl font-bold">Your account is protected</h1>
        <p className="text-sm text-muted-foreground">
          Save these recovery codes offline before continuing. They are shown
          only now. Each works once if you lose your authenticator; you still
          need Internet Identity.
        </p>
        <div className="rounded-xl bg-muted p-4 font-mono text-center space-y-3">
          {recoveryCodes.map((code) => (
            <div key={code}>{code}</div>
          ))}
        </div>
        <Button variant="outline" className="w-full gap-2" onClick={download}>
          <Download size={16} />
          Download recovery codes
        </Button>
        <Button className="w-full" onClick={dismissRecoveryCodes}>
          I saved my codes — continue
        </Button>
      </section>
    </div>
  );
}
