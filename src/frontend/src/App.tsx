import { useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Suspense, lazy, useEffect } from "react";
import { Layout } from "./components/Layout";
import { RecoveryCodes } from "./components/RecoveryCodes";
import { SecondFactorChallenge } from "./components/SecondFactorChallenge";
import { Toaster } from "./components/ui/sonner";
import { useActor } from "./hooks/use-actor";
import { useInternetIdentity } from "./hooks/use-auth";
import { useMyProfile } from "./hooks/use-backend";
const ChartsPage = lazy(() => import("./pages/ChartsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const FitnessPage = lazy(() => import("./pages/FitnessPage"));
import LoginPage from "./pages/LoginPage";
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const NutritionPage = lazy(() => import("./pages/NutritionPage"));
const PeoplePage = lazy(() => import("./pages/PeoplePage"));
const PlannerPage = lazy(() => import("./pages/PlannerPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

// ---- Auth guard ----
function AuthGuard({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isInitializing,
    userId,
    secondFactorRequired,
    loginError,
    refreshSecurity,
    clear,
    recoveryCodes,
  } = useInternetIdentity();
  const { connection } = useActor();
  const ownProfile = useMyProfile();
  const qc = useQueryClient();
  const id = userId;
  useEffect(() => {
    qc.removeQueries({
      predicate: (q) => q.queryKey[0] === "account" && q.queryKey[1] !== id,
    });
  }, [id, qc]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-pink-accent flex items-center justify-center animate-pulse">
            <span className="font-display font-black text-lg text-primary-foreground">
              N
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            Loading Nlock&apos;i…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (recoveryCodes.length) return <RecoveryCodes />;
  if (secondFactorRequired) return <SecondFactorChallenge />;
  if (loginError)
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-xl font-bold">Unable to verify your account</h1>
        <p
          role="alert"
          className="text-sm text-muted-foreground break-words max-w-xl"
        >
          Could not verify this session. Sign out and try again. For local
          testing, use email sign-in with the latest Docker setup.
        </p>
        <button type="button" onClick={() => void refreshSecurity()}>
          Retry
        </button>
        <button type="button" onClick={() => void clear()}>
          Sign out
        </button>
      </div>
    );
  if (connection.isError || ownProfile.isError) {
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-xl font-bold">Unable to connect</h1>
        <p role="alert">{(connection.error || ownProfile.error)?.message}</p>
        <button
          type="button"
          onClick={() => {
            connection.refetch();
            ownProfile.refetch();
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  if (!connection.data || ownProfile.isPending)
    return <div className="p-8">Connecting to your account…</div>;
  if (!ownProfile.data || ownProfile.data.username === ownProfile.data.userId)
    return <LoginPage />;
  return <>{children}</>;
}

// Root route — shared shell
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// App routes — wrapped in Layout + AuthGuard
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: () => (
    <AuthGuard>
      <Layout>
        <Outlet />
      </Layout>
    </AuthGuard>
  ),
});

// Standalone login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: DashboardPage,
});
const plannerRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/planner",
  component: PlannerPage,
});
const fitnessRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/fitness",
  component: FitnessPage,
});
const nutritionRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/nutrition",
  component: NutritionPage,
});
const chartsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/charts",
  component: ChartsPage,
});
const peopleRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/people",
  component: PeoplePage,
});
const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/profile/$userId",
  component: ProfilePage,
});
const messagesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/messages",
  component: MessagesPage,
});
const chatRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/messages/$userId",
  component: ChatPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    indexRoute,
    plannerRoute,
    fitnessRoute,
    nutritionRoute,
    chartsRoute,
    peopleRoute,
    profileRoute,
    messagesRoute,
    chatRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <>
      <Suspense
        fallback={
          <div
            className="min-h-[40vh] grid place-items-center text-muted-foreground"
            role="alert"
          >
            Loading your space…
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
      <Toaster position="bottom-right" />
    </>
  );
}
