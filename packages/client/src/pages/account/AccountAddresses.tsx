import type { Address } from "@amanda/shared";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { AddressForm } from "@/components/account/AddressForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { addAddress, removeAddress, updateAddress, type AddressInput } from "@/lib/usersApi";

export default function AccountAddresses() {
  const { user, setUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!user) return null;
  const addresses = user.addresses;

  async function handleAdd(input: AddressInput) {
    const result = await addAddress(input);
    setUser(result.user);
    setShowForm(false);
  }

  async function handleSetDefault(address: Address) {
    const result = await updateAddress(address._id, { isDefault: true });
    setUser(result.user);
  }

  async function handleRemove(addressId: string) {
    setDeletingId(addressId);
    try {
      const result = await removeAddress(addressId);
      setUser(result.user);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-text">Direcciones</h1>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="size-4" /> Agregar
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <AddressForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </Card>
      )}

      {addresses.length === 0 && !showForm ? (
        <EmptyState
          icon={MapPin}
          title="Todavía no tenés direcciones"
          description="Agregá una para agilizar tus próximas compras."
        />
      ) : (
        <AnimatePresence initial={false}>
          {addresses.map((address) => (
            <motion.div
              key={address._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-text-muted" />
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      {address.label && <p className="font-medium text-text">{address.label}</p>}
                      {address.isDefault && (
                        <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-deep">
                          <Star className="size-3" /> Predeterminada
                        </span>
                      )}
                    </div>
                    <p className="text-text-muted">
                      {address.street} {address.number}, {address.city}, {address.province} ({address.postalCode})
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!address.isDefault && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(address)}>
                      Usar como default
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(address._id)}
                    disabled={deletingId === address._id}
                    aria-label="Eliminar dirección"
                    className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-accent2-deep disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
