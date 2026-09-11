import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg text-text">Amanda Home & Deco</p>
          <p className="mt-1 max-w-xs text-sm text-text-muted">
            Textiles, cerámica y objetos que hacen de tu casa un lugar propio.
          </p>
        </div>
        <div className="flex gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-text">Tienda</span>
            <Link to="/catalogo" className="text-text-muted hover:text-accent-deep">
              Catálogo
            </Link>
            <Link to="/carrito" className="text-text-muted hover:text-accent-deep">
              Carrito
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-text">Cuenta</span>
            <Link to="/cuenta/pedidos" className="text-text-muted hover:text-accent-deep">
              Mis pedidos
            </Link>
            <Link to="/login" className="text-text-muted hover:text-accent-deep">
              Ingresar
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-text-muted sm:px-6">
        © {new Date().getFullYear()} Amanda Home & Deco — Buenos Aires, Argentina
      </div>
    </footer>
  );
}
