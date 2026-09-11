export interface SupplierPurchaseItem {
  product: string;
  variantSku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface SupplierPurchase {
  _id: string;
  supplierName: string;
  items: SupplierPurchaseItem[];
  totalCost: number;
  purchaseDate: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}
