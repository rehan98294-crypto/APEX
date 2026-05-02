import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { getAuthToken } from "@/lib/api";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Withdrawals from "@/pages/withdrawals";
import Users from "@/pages/users";
import UserDetail from "@/pages/user-detail";
import Activity from "@/pages/activity";
import Layout from "@/components/layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const [location, setLocation] = useLocation();
  const token = getAuthToken();

  if (!token) {
    setLocation("/login");
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        <Layout>
          <ProtectedRoute component={Dashboard} />
        </Layout>
      </Route>
      <Route path="/withdrawals">
        <Layout>
          <ProtectedRoute component={Withdrawals} />
        </Layout>
      </Route>
      <Route path="/users">
        <Layout>
          <ProtectedRoute component={Users} />
        </Layout>
      </Route>
      <Route path="/users/:id">
        <Layout>
          <ProtectedRoute component={UserDetail} />
        </Layout>
      </Route>
      <Route path="/activity">
        <Layout>
          <ProtectedRoute component={Activity} />
        </Layout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
