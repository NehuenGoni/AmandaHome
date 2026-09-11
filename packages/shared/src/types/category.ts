import type { WithTimestamps } from "./common.js";

export interface Category extends WithTimestamps {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent: string | null;
  order: number;
  isActive: boolean;
}
