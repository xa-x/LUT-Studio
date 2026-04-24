"use server";

import { db } from "@/lib/db";
import { luts } from "@/lib/db/schema";
import { eq, and, desc, asc, sql, like } from "drizzle-orm";
import type { Lut, NewLut } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GetLutsOptions {
  category?: string;
  published?: boolean;
  sample?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: "newest" | "oldest" | "name";
}

interface GetLutsResult {
  luts: Lut[];
  total: number;
  limit: number;
  offset: number;
}

interface CreateLutData {
  name: string;
  description?: string;
  category?: string;
  params: unknown;
  thumbnailUrl?: string;
  isPublished?: boolean;
}

interface UpdateLutData {
  name?: string;
  description?: string | null;
  category?: string;
  params?: unknown;
  thumbnailUrl?: string | null;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/** List LUTs with optional filters. */
export async function getLuts(
  options: GetLutsOptions = {},
): Promise<GetLutsResult> {
  const {
    category,
    published,
    sample,
    search,
    limit = 50,
    offset = 0,
    sort = "newest",
  } = options;

  const conditions = [];

  if (category) {
    conditions.push(eq(luts.category, category));
  }
  if (published !== undefined) {
    conditions.push(eq(luts.isPublished, published));
  }
  if (sample !== undefined) {
    conditions.push(eq(luts.isSample, sample));
  }
  if (search) {
    conditions.push(like(luts.name, `%${search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy =
    sort === "oldest"
      ? asc(luts.createdAt)
      : sort === "name"
        ? asc(luts.name)
        : desc(luts.createdAt);

  const results = await db
    .select()
    .from(luts)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(luts)
    .where(where);

  const total = countResult[0]?.count ?? 0;

  return { luts: results, total, limit, offset };
}

/** Get a single LUT by ID. */
export async function getLutById(id: string): Promise<Lut | null> {
  const result = await db.select().from(luts).where(eq(luts.id, id));
  return result[0] ?? null;
}

/** Create a new LUT. */
export async function createLut(data: CreateLutData): Promise<Lut> {
  if (!data.name || !data.params) {
    throw new Error("name and params are required");
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newLut: NewLut = {
    id,
    name: data.name,
    description: data.description ?? null,
    category: data.category ?? "custom",
    params: data.params,
    thumbnailUrl: data.thumbnailUrl ?? null,
    isSample: false,
    isPublished: data.isPublished ?? false,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(luts).values(newLut);

  return newLut as Lut;
}

/** Update an existing LUT. */
export async function updateLut(
  id: string,
  data: UpdateLutData,
): Promise<Lut> {
  const existing = await db.select().from(luts).where(eq(luts.id, id));
  if (existing.length === 0) {
    throw new Error("LUT not found");
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.category !== undefined) updates.category = data.category;
  if (data.params !== undefined) updates.params = data.params;
  if (data.thumbnailUrl !== undefined) updates.thumbnailUrl = data.thumbnailUrl;

  await db.update(luts).set(updates).where(eq(luts.id, id));

  const updated = await db.select().from(luts).where(eq(luts.id, id));
  return updated[0];
}

/** Delete a LUT by ID. */
export async function deleteLut(id: string): Promise<{ success: boolean; deleted: string }> {
  const existing = await db.select().from(luts).where(eq(luts.id, id));
  if (existing.length === 0) {
    throw new Error("LUT not found");
  }

  await db.delete(luts).where(eq(luts.id, id));
  return { success: true, deleted: id };
}

/** Toggle the published status of a LUT. */
export async function togglePublish(
  id: string,
  published: boolean,
): Promise<Lut> {
  if (typeof published !== "boolean") {
    throw new Error("published (boolean) is required");
  }

  const existing = await db.select().from(luts).where(eq(luts.id, id));
  if (existing.length === 0) {
    throw new Error("LUT not found");
  }

  await db
    .update(luts)
    .set({
      isPublished: published,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(luts.id, id));

  const updated = await db.select().from(luts).where(eq(luts.id, id));
  return updated[0];
}
