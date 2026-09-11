import { formatMoney } from "@amanda/shared";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Truck } from "lucide-react";
import { useState } from "react";
import { SupplierPurchaseForm } from "@/components/admin/SupplierPurchaseForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useSupplierPurchases } from "@/hooks/admin/useSupplierPurchases";

export default function AdminSupplierPurchases() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, reload } = useSupplierPurchases(page);

  function handleCreated() {
    setShowForm(false);
    reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-text">Compras a proveedores</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="size-4" /> Nueva compra
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <Card>
              <p className="mb-4 font-display text-lg text-text">Nueva compra</p>
              <SupplierPurchaseForm onCreated={handleCreated} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <Spinner />
      ) : data && data.items.length > 0 ? (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {data.items.map((purchase) => (
              <div key={purchase._id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-text">{purchase.supplierName}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(purchase.purchaseDate).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {purchase.items.length} ítem{purchase.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-sm font-medium text-text">{formatMoney(purchase.totalCost)}</span>
              </div>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon={Truck} title="Todavía no registraste compras" />
      )}
    </div>
  );
}
