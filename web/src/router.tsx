import { createBrowserRouter } from "react-router-dom";
import AppShell from "@/views/AppShell";
import SignIn from "@/views/SignIn";
import AdminHome from "@/views/admin/AdminHome";
import AgencyHome from "@/views/agency/AgencyHome";
import ClientView from "@/views/client/ClientView";
import RouteGuard from "@/auth/RouteGuard";
import HomeRedirect from "@/auth/HomeRedirect";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRedirect /> },
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
          <RouteGuard requireRole={["agency", "platform_admin", "client"]} restrictClientToOwn>
            <ClientView />
          </RouteGuard>
        ),
      },
    ],
  },
]);
