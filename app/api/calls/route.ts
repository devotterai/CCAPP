import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/calls — get call history, optionally filtered by leadId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    const calls = await prisma.callLog.findMany({
      where: leadId ? { leadId } : undefined,
      orderBy: { startedAt: "desc" },
      take: 100,
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error("Error fetching call logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch call history" },
      { status: 500 }
    );
  }
}

// POST /api/calls — create a call log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const callLog = await prisma.callLog.create({
      data: {
        leadId: body.leadId || "",
        leadName: body.leadName || "",
        leadPhone: body.leadPhone || "",
        callSid: body.callSid || "",
        status: body.status || "initiated",
        duration: body.duration || 0,
        notes: body.notes || "",
      },
    });

    return NextResponse.json(callLog, { status: 201 });
  } catch (error) {
    console.error("Error creating call log:", error);
    return NextResponse.json(
      { error: "Failed to create call log" },
      { status: 500 }
    );
  }
}

// PATCH /api/calls — update a call log entry
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const callLog = await prisma.callLog.update({
      where: { id },
      data,
    });

    return NextResponse.json(callLog);
  } catch (error) {
    console.error("Error updating call log:", error);
    return NextResponse.json(
      { error: "Failed to update call log" },
      { status: 500 }
    );
  }
}
