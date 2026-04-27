import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "@/views/AppShell";
import SignIn from "@/views/SignIn";
import AdminHome from "@/views/admin/AdminHome";
import AgencyHome from "@/views/agency/AgencyHome";
import ClientView from "@/views/client/ClientView";
import RouteGuard from "@/auth/RouteGuard";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/agency" replace /> },
      { path: "signin", element: <SignIn /> },
      {
        path: "admin",
        element: (
          <RouteGuard requireRole="platform_admin">
            <AdminHome />
          </RouteGuard>
        ),
      },
      {
        path: "agency",
        element: (
          <RouteGuard requireRole={["agency", "platform_admin"]}>
            <AgencyHome />
          </RouteGuard>
        ),
      },
      {
        path: "agency/clients/:slug",
        element: (
          <RouteGuard requireRole={["agency", "platform_admin", "client"]}>
            <ClientView />
          </RouteGuard>
        ),
      },
    ],
  },
]);
