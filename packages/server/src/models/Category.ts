import { slugify } from "@amanda/shared";
import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent: Types.ObjectId | null;
  order: number;
  isActive: boolean;
}

export type CategoryDocument = HydratedDocument<ICategory>;

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ parent: 1, order: 1 });

categorySchema.pre("validate", function generateSlug(next) {
  if (this.isModified("slug") && this.slug) {
    this.slug = slugify(this.slug);
  } else if (this.isModified("name")) {
    this.slug = slugify(this.name);
  }
  next();
});

export const Category = model<ICategory>("Category", categorySchema);
