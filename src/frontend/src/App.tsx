import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Layout } from "./components/Layout";
import ChartsPage from "./pages/ChartsPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import FitnessPage from "./pages/FitnessPage";
import LoginPage from "./pages/LoginPage";
import MessagesPage from "./pages/MessagesPage";
import NutritionPage from "./pages/NutritionPage";
import PeoplePage from "./pages/PeoplePage";
import PlannerPage from "./pages/PlannerPage";
import ProfilePage from "./pages/ProfilePage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 30 } },
});

// ---- Auth guard ----
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useInternetIdentity();

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
    <Layout>
      <AuthGuard>
        <Outlet />
      </AuthGuard>
    </Layout>
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
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
