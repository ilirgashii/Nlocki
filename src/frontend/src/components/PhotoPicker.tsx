import { useState } from "react";
import { preparePhoto } from "../lib/photo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function PhotoPicker({
  value,
  onChange,
  onProcessing,
  prefix,
}: {
  value: string;
  onChange: (value: string) => void;
  onProcessing: (busy: boolean) => void;
  prefix: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function select(file?: File) {
    if (!file) return;
    setBusy(true);
    onProcessing(true);
    setError("");
    try {
      onChange(await preparePhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read photo.");
    } finally {
      setBusy(false);
      onProcessing(false);
    }
  }
  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload photo"
        data-ocid={`${prefix}.file`}
        disabled={busy}
        onChange={(e) => {
          void select(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {!value.startsWith("data:") && (
        <Input
          type="url"
          placeholder="Or use an HTTPS photo URL"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Photo URL"
        />
      )}
      {busy && (
        <p className="text-sm text-muted-foreground">Preparing photo…</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {value && (
        <>
          <img
            src={value}
            alt="Selected upload"
            className="max-h-32 rounded-lg"
          />
          <Button type="button" variant="ghost" onClick={() => onChange("")}>
            Remove photo
          </Button>
        </>
      )}
    </div>
  );
}
