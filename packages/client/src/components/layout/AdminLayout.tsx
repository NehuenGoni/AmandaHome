import { LogOut, Store } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "./Logo";
import { PageTransition } from "./PageTransition";
import { ProtectedRoute } from "./ProtectedRoute";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <ProtectedRoute role="admin">
      <div className="admin-app min-h-screen bg-bg">
        <header className="sticky top-0 z-40 border-b border-border bg-surface">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link to="/admin" aria-label="Amanda Home & Deco">
              <Logo className="h-11 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden text-base text-text-muted lg:inline">{user?.email}</span>
              <ThemeToggle />
              <Link
                to="/"
                className="flex min-h-12 items-center gap-2 rounded-full border-2 border-field px-5 text-base font-medium text-text transition-colors hover:bg-surface-alt"
              >
                <Store className="size-5" /> Ver tienda
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-12 items-center gap-2 rounded-full px-5 text-base font-medium text-accent2-deep transition-colors hover:bg-surface-alt"
              >
                <LogOut className="size-5" /> Salir
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:gap-10 sm:grid-cols-[17rem_1fr]">
          <AdminNav />
          <div className="min-w-0">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
