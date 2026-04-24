import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { luts } from "@/lib/db/schema";
import { eq, and, desc, asc, sql, like } from "drizzle-orm";

// GET /api/luts — List LUTs with optional filters
// Query params: category, published, sample, search, limit, offset, sort (newest|oldest|name)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const published = searchParams.get("published");
    const sample = searchParams.get("sample");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sort = searchParams.get("sort") || "newest";

    const conditions = [];

    if (category) {
      conditions.push(eq(luts.category, category));
    }
    if (published !== null && published !== null) {
      conditions.push(eq(luts.isPublished, published === "true"));
    }
    if (sample !== null && sample !== null) {
      conditions.push(eq(luts.isSample, sample === "true"));
    }
    if (search) {
      conditions.push(like(luts.name, `%${search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const orderBy =
      sort === "oldest" ? asc(luts.createdAt) :
      sort === "name" ? asc(luts.name) :
      desc(luts.createdAt);

    const results = await db
      .select()
      .from(luts)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(luts)
      .where(where);

    const total = countResult[0]?.count ?? 0;

    return NextResponse.json({
      luts: results,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /api/luts error:", error);
    return NextResponse.json({ error: "Failed to fetch LUTs" }, { status: 500 });
  }
}

// POST /api/luts — Create a new LUT
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, description, category, params, thumbnailUrl, isPublished } = body;

    if (!name || !params) {
      return NextResponse.json(
        { error: "name and params are required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newLut = {
      id,
      name,
      description: description ?? null,
      category: category ?? "custom",
      params,
      thumbnailUrl: thumbnailUrl ?? null,
      isSample: false,
      isPublished: isPublished ?? false,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(luts).values(newLut);

    return NextResponse.json(newLut, { status: 201 });
  } catch (error) {
    console.error("POST /api/luts error:", error);
    return NextResponse.json({ error: "Failed to create LUT" }, { status: 500 });
  }
}
