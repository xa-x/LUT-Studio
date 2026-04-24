import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { luts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/luts/[id] — Get a single LUT
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db.select().from(luts).where(eq(luts.id, id));

    if (result.length === 0) {
      return NextResponse.json({ error: "LUT not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("GET /api/luts/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch LUT" }, { status: 500 });
  }
}

// PUT /api/luts/[id] — Update a LUT
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, description, category, params: lutParams, thumbnailUrl } = body;

    const existing = await db.select().from(luts).where(eq(luts.id, id));
    if (existing.length === 0) {
      return NextResponse.json({ error: "LUT not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (lutParams !== undefined) updates.params = lutParams;
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;

    await db.update(luts).set(updates).where(eq(luts.id, id));

    const updated = await db.select().from(luts).where(eq(luts.id, id));
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("PUT /api/luts/[id] error:", error);
    return NextResponse.json({ error: "Failed to update LUT" }, { status: 500 });
  }
}

// DELETE /api/luts/[id] — Delete a LUT
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.select().from(luts).where(eq(luts.id, id));
    if (existing.length === 0) {
      return NextResponse.json({ error: "LUT not found" }, { status: 404 });
    }

    await db.delete(luts).where(eq(luts.id, id));

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("DELETE /api/luts/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete LUT" }, { status: 500 });
  }
}
