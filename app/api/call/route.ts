import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";

// POST /api/call — initiate a Twilio call
export async function POST(request: NextRequest) {
  try {
    const { to, leadId } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Get Twilio settings
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const accountSid = settingsMap.TWILIO_ACCOUNT_SID;
    const authToken = settingsMap.TWILIO_AUTH_TOKEN;
    const fromNumber = settingsMap.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        {
          error:
            "Twilio credentials not configured. Go to Settings to add your Twilio Account SID, Auth Token, and Phone Number.",
        },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Create a TwiML response that connects the call to the agent's phone
    // The call will connect the Twilio number to the lead's phone
    const call = await client.calls.create({
      to,
      from: fromNumber,
      twiml: `<Response><Dial>${to}</Dial></Response>`,
    });

    // Update lead disposition if provided
    if (leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (lead && lead.disposition === "NEW") {
        await prisma.lead.update({
          where: { id: leadId },
          data: { disposition: "CALLED_NO_ANSWER" },
        });
      }
    }

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    const message =
      error instanceof Error ? error.message : "Failed to initiate call";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
