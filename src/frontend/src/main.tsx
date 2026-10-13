import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { toast } from "sonner";
import App from "./App";
import { InternetIdentityProvider } from "./hooks/use-auth";
import "./index.css";
import "./lib/install-prompt";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => toast.error(error.message),
  }),
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() =>
        console.warn(
          "Install support is unavailable; the web app remains usable online.",
        ),
      );
  });
}
