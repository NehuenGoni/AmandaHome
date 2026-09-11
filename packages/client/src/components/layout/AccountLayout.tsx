import { Outlet } from "react-router-dom";
import { AccountNav } from "@/components/account/AccountNav";
import { ProtectedRoute } from "./ProtectedRoute";
import { PageTransition } from "./PageTransition";

export function AccountLayout() {
  return (
    <ProtectedRoute>
      <div className="grid gap-8 sm:grid-cols-[220px_1fr]">
        <AccountNav />
        <div className="min-w-0">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </div>
    </ProtectedRoute>
  );
}
