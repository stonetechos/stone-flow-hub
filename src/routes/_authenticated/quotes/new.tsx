import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/quotes/new")({
  ssr: false,
  component: () => <Navigate to="/quotes" search={{ new: "1" }} replace />,
});
