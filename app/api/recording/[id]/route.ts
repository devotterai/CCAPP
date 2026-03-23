import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/recording/[id] — proxy to stream a Twilio recording
// This avoids exposing Twilio credentials to the browser
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the call log with this ID
    const callLog = await prisma.callLog.findUnique({ where: { id } });

    if (!callLog || !callLog.recordingUrl) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Get Twilio credentials for authenticated access
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"] },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;

    const accountSid = settingsMap.TWILIO_ACCOUNT_SID;
    const authToken = settingsMap.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Twilio credentials not configured" },
        { status: 400 }
      );
    }

    // Fetch the recording from Twilio with auth
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(callLog.recordingUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch recording" },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error proxying recording:", error);
    return NextResponse.json(
      { error: "Failed to load recording" },
      { status: 500 }
    );
  }
}
