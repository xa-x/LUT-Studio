import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { luts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PATCH /api/luts/[id]/publish — Toggle publish status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { published } = body;

    if (typeof published !== "boolean") {
      return NextResponse.json(
        { error: "published (boolean) is required" },
        { status: 400 }
      );
    }

    const existing = await db.select().from(luts).where(eq(luts.id, id));
    if (existing.length === 0) {
      return NextResponse.json({ error: "LUT not found" }, { status: 404 });
    }

    await db
      .update(luts)
      .set({
        isPublished: published,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(luts.id, id));

    const updated = await db.select().from(luts).where(eq(luts.id, id));
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("PATCH /api/luts/[id]/publish error:", error);
    return NextResponse.json({ error: "Failed to update publish status" }, { status: 500 });
  }
}
