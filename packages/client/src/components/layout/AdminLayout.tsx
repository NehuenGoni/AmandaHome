import { LogOut, Store } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
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
      <div className="min-h-screen bg-bg">
        <header className="sticky top-0 z-40 border-b border-border bg-surface">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link to="/admin" className="font-display text-lg tracking-tight text-text">
              Amanda <span className="text-accent-deep">Admin</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-text-muted sm:inline">{user?.email}</span>
              <ThemeToggle />
              <Link
                to="/"
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-alt"
              >
                <Store className="size-4" /> Ver tienda
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-accent2-deep transition-colors hover:bg-surface-alt"
              >
                <LogOut className="size-4" /> Salir
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:grid-cols-[220px_1fr]">
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
