import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
export function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (online) return null;
  return (
    <output className="flex gap-2 items-center justify-center px-4 py-2 text-sm bg-amber-500/10 text-amber-700 dark:text-amber-300">
      <WifiOff size={16} />
      You&apos;re offline. Reconnect to save changes.
    </output>
  );
}
