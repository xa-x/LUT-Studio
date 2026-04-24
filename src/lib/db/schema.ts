import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const luts = sqliteTable("luts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("custom"), // custom, cinematic, film, fuji, vintage, bw
  params: text("params", { mode: "json" }).notNull(), // FilterParams JSON
  thumbnailUrl: text("thumbnail_url"),
  isSample: integer("is_sample", { mode: "boolean" }).notNull().default(false),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Lut = typeof luts.$inferSelect;
export type NewLut = typeof luts.$inferInsert;
