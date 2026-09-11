import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="py-10">
      <EmptyState
        icon={Compass}
        title="Esta página no existe"
        description="Puede que el link esté roto o que la página se haya movido."
        action={
          <Link to="/">
            <Button variant="secondary">Volver al inicio</Button>
          </Link>
        }
      />
    </div>
  );
}
