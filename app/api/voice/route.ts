import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

// POST /api/voice — TwiML webhook called by Twilio when browser makes a call
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const to = formData.get("To") as string;

    const twiml = new VoiceResponse();

    if (to) {
      // Get the Twilio phone number for caller ID
      const phoneSetting = await prisma.setting.findFirst({
        where: { key: "TWILIO_PHONE_NUMBER" },
      });
      const callerId = phoneSetting?.value || "";

      const dial = twiml.dial({ callerId });
      dial.number(to);
    } else {
      twiml.say("No phone number specified.");
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("Error in voice webhook:", error);
    const twiml = new VoiceResponse();
    twiml.say("An error occurred. Please try again.");

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}

// Also handle GET for Twilio webhook verification
export async function GET() {
  const twiml = new VoiceResponse();
  twiml.say("This is the CCAPP voice webhook.");

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}
