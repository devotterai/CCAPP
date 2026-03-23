import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

// POST /api/email — send a personalized email
export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, leadId } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Recipient, subject, and body are required" },
        { status: 400 }
      );
    }

    // Get Gmail settings
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["GMAIL_SENDER_EMAIL", "GMAIL_APP_PASSWORD", "GMAIL_SENDER_NAME"],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const senderEmail = settingsMap.GMAIL_SENDER_EMAIL;
    const appPassword = settingsMap.GMAIL_APP_PASSWORD;
    const senderName = settingsMap.GMAIL_SENDER_NAME || senderEmail;

    if (!senderEmail || !appPassword) {
      return NextResponse.json(
        {
          error:
            "Gmail credentials not configured. Go to Settings to add your sender email and app password.",
        },
        { status: 400 }
      );
    }

    // Create SMTP transport for Google Workspace
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: senderEmail,
        pass: appPassword,
      },
    });

    // Send the email
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, "<br>"),
    });

    // Log for debugging
    console.log("Email sent:", info.messageId);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      leadId,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
