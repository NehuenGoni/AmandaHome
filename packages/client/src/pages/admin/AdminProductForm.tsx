import { useNavigate, useParams } from "react-router-dom";
import { ProductForm } from "@/components/admin/ProductForm";
import { Spinner } from "@/components/ui/Spinner";
import { useAdminProduct } from "@/hooks/admin/useAdminProduct";
import { createProduct, updateProduct, type ProductInput } from "@/lib/adminProductsApi";

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { product, isLoading } = useAdminProduct(id);
  const isEditing = Boolean(id);

  async function handleSubmit(input: ProductInput) {
    if (id) {
      // El stock no se edita desde acá: el servidor lo conserva y se ajusta desde Inventario.
      const variants = input.variants.map(({ stock: _stock, ...variant }) => variant);
      await updateProduct(id, { ...input, variants });
    } else {
      await createProduct(input);
    }
    navigate("/admin/productos");
  }

  if (isEditing && isLoading) return <Spinner label="Buscando el producto…" />;
  if (isEditing && !product) return <p className="text-sm text-text-muted">Producto no encontrado.</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text">{isEditing ? "Editar producto" : "Nuevo producto"}</h1>
      <ProductForm
        initialValue={product ?? undefined}
        onSubmit={handleSubmit}
        submitLabel={isEditing ? "Guardar cambios" : "Crear producto"}
      />
    </div>
  );
}
