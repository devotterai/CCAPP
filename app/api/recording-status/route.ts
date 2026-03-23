import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/recording-status — Twilio webhook called when a recording is ready
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const callSid = formData.get("CallSid") as string;
    const recordingSid = formData.get("RecordingSid") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingDuration = parseInt(
      (formData.get("RecordingDuration") as string) || "0"
    );

    // Log all form data for debugging
    const allData: Record<string, string> = {};
    formData.forEach((value, key) => {
      allData[key] = value.toString();
    });
    console.log("Recording status callback received:", allData);

    if (!recordingUrl) {
      console.log("No recording URL received, skipping");
      return new NextResponse("OK", { status: 200 });
    }

    // Try to find matching call log
    let callLog = null;

    // Strategy 1: Match by callSid
    if (callSid) {
      callLog = await prisma.callLog.findFirst({
        where: { callSid },
      });
    }

    // Strategy 2: Match by the most recent call log without a recording
    // (fallback when browser SDK callSid differs from server-side callSid)
    if (!callLog) {
      callLog = await prisma.callLog.findFirst({
        where: {
          recordingUrl: "",
          startedAt: {
            // Only match calls from the last 10 minutes
            gte: new Date(Date.now() - 10 * 60 * 1000),
          },
        },
        orderBy: { startedAt: "desc" },
      });
    }

    if (callLog) {
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          recordingSid,
          recordingUrl: `${recordingUrl}.mp3`,
          duration: recordingDuration || callLog.duration,
          callSid: callSid || callLog.callSid,
        },
      });
      console.log(`Updated call log ${callLog.id} with recording ${recordingSid}`);
    } else {
      console.log("No matching call log found for recording:", callSid);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing recording status:", error);
    return new NextResponse("OK", { status: 200 });
  }
}
