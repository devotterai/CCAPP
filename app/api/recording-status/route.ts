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

    console.log("Recording completed:", {
      callSid,
      recordingSid,
      recordingUrl,
      recordingDuration,
    });

    if (callSid) {
      // Find the call log entry by callSid and update with recording info
      const callLog = await prisma.callLog.findFirst({
        where: { callSid },
      });

      if (callLog) {
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            recordingSid,
            recordingUrl: recordingUrl
              ? `${recordingUrl}.mp3`
              : "",
            duration: recordingDuration || callLog.duration,
          },
        });
      }
    }

    // Twilio expects 200 OK
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing recording status:", error);
    return new NextResponse("OK", { status: 200 });
  }
}
