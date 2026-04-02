import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";

// GET /api/sms — fetch SMS history (optionally filtered by leadId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    const where = leadId ? { leadId } : {};

    const messages = await prisma.smsLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: 100,
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching SMS logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch SMS history" },
      { status: 500 }
    );
  }
}

// POST /api/sms — send an SMS via Twilio and log it
export async function POST(request: NextRequest) {
  try {
    const { to, body, leadId, leadName } = await request.json();

    if (!to || !body) {
      return NextResponse.json(
        { error: "Phone number and message body are required" },
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

    // Send SMS
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to,
    });

    // Log the message
    const smsLog = await prisma.smsLog.create({
      data: {
        leadId: leadId || "",
        leadName: leadName || "",
        leadPhone: to,
        body,
        status: message.status || "sent",
        twilioSid: message.sid || "",
        direction: "outbound",
      },
    });

    return NextResponse.json({
      success: true,
      messageSid: message.sid,
      status: message.status,
      id: smsLog.id,
    });
  } catch (error) {
    console.error("Error sending SMS:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to send SMS";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
