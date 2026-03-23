import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/settings — get all settings
export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error("Error fetching settings:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const dbUrl = process.env.DATABASE_URL || "NOT SET";
    const host = dbUrl.replace(/^.*@/, "").replace(/[:\/].*$/, "");
    return NextResponse.json(
      { error: "Failed to fetch settings", detail: msg, db_host: host },
      { status: 500 }
    );
  }
}

// POST /api/settings — save settings (upsert)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to save settings", detail: msg },
      { status: 500 }
    );
  }
}
