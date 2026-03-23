import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";

// POST /api/call — initiate a Twilio call
// Flow: Twilio calls the LEAD, and when they answer, plays a connecting message
// then dials the AGENT (your phone). This creates a two-leg call bridging you and the lead.
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
          in: [
            "TWILIO_ACCOUNT_SID",
            "TWILIO_AUTH_TOKEN",
            "TWILIO_PHONE_NUMBER",
            "AGENT_PHONE_NUMBER",
          ],
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
    const agentNumber = settingsMap.AGENT_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        {
          error:
            "Twilio credentials not configured. Go to Settings to add your Twilio Account SID, Auth Token, and Phone Number.",
        },
        { status: 400 }
      );
    }

    if (!agentNumber) {
      return NextResponse.json(
        {
          error:
            "Your phone number (Agent Phone) is not configured. Go to Settings to add your personal phone number so calls can be connected to you.",
        },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Twilio calls YOUR phone first. When you pick up, it says the lead name
    // and connects you to the lead's phone.
    const call = await client.calls.create({
      to: agentNumber, // Call YOU first
      from: fromNumber, // Your Twilio number shows on caller ID
      twiml: `<Response><Say>Connecting you to the lead now.</Say><Dial callerId="${fromNumber}">${to}</Dial></Response>`,
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
