import type { ShippingSettings } from "@amanda/shared";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/apiClient";
import { getAdminShippingSettings, updateAdminShippingSettings } from "@/lib/shippingApi";

export default function AdminShipping() {
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasFreeShipping, setHasFreeShipping] = useState(false);

  useEffect(() => {
    getAdminShippingSettings()
      .then(({ settings: fetched }) => {
        setSettings(fetched);
        setHasFreeShipping(fetched.freeShippingThreshold !== undefined);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos cargar la configuración"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner label="Cargando configuración de envíos…" />;
  if (!settings) return <p className="text-sm text-text-muted">No pudimos cargar la configuración.</p>;

  function patch(next: Partial<ShippingSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...next } : prev));
    setSuccess(false);
  }

  async function handleSave() {
    if (!settings) return;
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const { settings: saved } = await updateAdminShippingSettings({
        ...settings,
        freeShippingThreshold: hasFreeShipping ? settings.freeShippingThreshold : null,
      } as Partial<ShippingSettings>);
      setSettings(saved);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text">Envíos</h1>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg text-text">Retiro en el local</p>
            <p className="text-sm text-text-muted">El cliente no necesita cargar una dirección.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={settings.pickup.enabled}
              onChange={(e) => patch({ pickup: { ...settings.pickup, enabled: e.target.checked } })}
            />
            Habilitado
          </label>
        </div>
        {settings.pickup.enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Dirección del local"
              value={settings.pickup.address ?? ""}
              onChange={(e) => patch({ pickup: { ...settings.pickup, address: e.target.value } })}
            />
            <Input
              label="Horarios"
              placeholder="Lun a vie, 10 a 18hs"
              value={settings.pickup.hours ?? ""}
              onChange={(e) => patch({ pickup: { ...settings.pickup, hours: e.target.value } })}
            />
            <Input
              label="Instrucciones (opcional)"
              className="sm:col-span-2"
              value={settings.pickup.instructions ?? ""}
              onChange={(e) => patch({ pickup: { ...settings.pickup, instructions: e.target.value } })}
            />
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg text-text">Envío a domicilio (Correo Argentino)</p>
            <p className="text-sm text-text-muted">
              Se cotiza automáticamente con Correo Argentino. Si el correo no responde, se usa el precio de
              respaldo.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={settings.home.enabled}
              onChange={(e) => patch({ home: { ...settings.home, enabled: e.target.checked } })}
            />
            Habilitado
          </label>
        </div>
        {settings.home.enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyInput
              label="Precio de respaldo (Clásico)"
              value={settings.home.fallbackCost}
              onChange={(cents) => patch({ home: { ...settings.home, fallbackCost: cents } })}
            />
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg text-text">Retiro en sucursal de Correo</p>
            <p className="text-sm text-text-muted">
              El cliente elige una sucursal de Correo Argentino y retira ahí. Suele ser más barato que a
              domicilio. Si el correo no responde, esta opción no se ofrece.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={settings.branch.enabled}
              onChange={(e) => patch({ branch: { ...settings.branch, enabled: e.target.checked } })}
            />
            Habilitado
          </label>
        </div>
      </Card>

      {(settings.home.enabled || settings.branch.enabled) && (
        <Card className="flex flex-col gap-4">
          <p className="font-display text-lg text-text">Correo Argentino</p>
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.home.expressEnabled}
              onChange={(e) => patch({ home: { ...settings.home, expressEnabled: e.target.checked } })}
            />
            <span>
              Ofrecer también el servicio Expreso
              <span className="block text-text-muted">
                Llega más rápido y cuesta más. Se muestra junto al Clásico, a domicilio y a sucursal.
              </span>
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Código postal de origen"
              value={settings.originPostalCode}
              onChange={(e) => patch({ originPostalCode: e.target.value })}
            />
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg text-text">Envío gratis desde un monto</p>
            <p className="text-sm text-text-muted">Aplica al servicio Clásico. El Expreso se cobra siempre.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={hasFreeShipping}
              onChange={(e) => {
                setHasFreeShipping(e.target.checked);
                setSuccess(false);
              }}
            />
            Activado
          </label>
        </div>
        {hasFreeShipping && (
          <MoneyInput
            label="Monto mínimo"
            value={settings.freeShippingThreshold ?? 0}
            onChange={(cents) => patch({ freeShippingThreshold: cents })}
          />
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="font-display text-lg text-text">Paquete por defecto</p>
        <p className="text-sm text-text-muted">
          Se usa para cotizar productos que todavía no tienen peso ni medidas cargadas.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input
            label="Peso en gramos"
            type="number"
            min={1}
            value={settings.defaultPackage.weight}
            onChange={(e) =>
              patch({ defaultPackage: { ...settings.defaultPackage, weight: Number(e.target.value) } })
            }
          />
          <Input
            label="Alto en cm"
            type="number"
            min={1}
            value={settings.defaultPackage.height}
            onChange={(e) =>
              patch({ defaultPackage: { ...settings.defaultPackage, height: Number(e.target.value) } })
            }
          />
          <Input
            label="Ancho en cm"
            type="number"
            min={1}
            value={settings.defaultPackage.width}
            onChange={(e) =>
              patch({ defaultPackage: { ...settings.defaultPackage, width: Number(e.target.value) } })
            }
          />
          <Input
            label="Largo en cm"
            type="number"
            min={1}
            value={settings.defaultPackage.length}
            onChange={(e) =>
              patch({ defaultPackage: { ...settings.defaultPackage, length: Number(e.target.value) } })
            }
          />
        </div>
      </Card>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      {success && <InlineMessage tone="success">Configuración guardada.</InlineMessage>}

      <div>
        <Button isLoading={isSaving} onClick={handleSave}>
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
