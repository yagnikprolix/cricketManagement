import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import dbConnect from '@/lib/db';
import Match from '@/models/Match';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const session = await getSessionUser();
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const match = await Match.findById(id);
    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Get all registered users
    const users = await User.find({}).select('email name');
    const emails = users.map((u) => u.email);

    if (emails.length === 0) {
      return NextResponse.json(
        { message: 'No registered players found to email.' },
        { status: 200 }
      );
    }

    // Configure Nodemailer transporter
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || '"Cricket Club" <no-reply@example.com>';

    let info = null;
    let fallbackMode = false;

    // Formatted date for email body
    const formattedDate = new Date(match.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const yesAttendeesCount = match.rsvps?.filter((r) => r.status === 'yes').length || 0;
    const playerShare = yesAttendeesCount > 0 ? (match.totalCost / yesAttendeesCount) : match.totalCost;

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 30px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 6px solid #10b981;">
          
          <!-- Header -->
          <div style="background-color: #0f172a; padding: 30px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; color: #10b981;">CRICKET CLUB</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #94a3b8;">New Match Schedule & Details</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px 30px; color: #334155; line-height: 1.6;">
            <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">🏏 Upcoming Match: ${match.title}</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #64748b; width: 150px;">📅 Date:</td>
                <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #64748b;">⏰ Time:</td>
                <td style="padding: 10px 0; color: #0f172a;">${match.time}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #64748b;">📍 Location:</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 500;">${match.location}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #64748b;">💵 Total Match Cost:</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">₹${match.totalCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #64748b;">👥 Attending Players:</td>
                <td style="padding: 10px 0; color: #0f172a;">${yesAttendeesCount} player${yesAttendeesCount !== 1 ? 's' : ''}</td>
              </tr>
              <tr style="border-top: 1px dashed #e2e8f0;">
                <td style="padding: 15px 0 10px 0; font-weight: 700; color: #0f172a;">💰 Your Estimated Share:</td>
                <td style="padding: 15px 0 10px 0; color: #10b981; font-weight: 800; font-size: 18px;">₹${playerShare.toFixed(2)}</td>
              </tr>
            </table>

            ${match.notes ? `
            <div style="background-color: #f8fafc; border-left: 4px solid #64748b; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
              <strong style="color: #475569;">Admin Notes:</strong>
              <p style="margin: 5px 0 0 0; font-style: italic; color: #475569;">${match.notes}</p>
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 700; display: inline-block; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">
                RSVP YES / NO NOW
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">You received this email because you are registered in the Cricket Management System.</p>
            <p style="margin: 5px 0 0 0;">Please log in to submit your response.</p>
          </div>

        </div>
      </div>
    `;

    // Try using configured SMTP transporter, or fall back to server logs
    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      info = await transporter.sendMail({
        from: smtpFrom,
        to: emails.join(', '),
        subject: `🏏 Match Invitation: ${match.title} - ${formattedDate}`,
        html: htmlContent,
      });
    } else {
      fallbackMode = true;
      console.log('====== SMTP IS NOT CONFIGURED. MOCK EMAIL BROADCAST =====');
      console.log(`To: ${emails.join(', ')}`);
      console.log(`Subject: 🏏 Match Invitation: ${match.title} - ${formattedDate}`);
      console.log(`HTML Body Content: \n${htmlContent}`);
      console.log('==========================================================');
    }

    return NextResponse.json(
      {
        message: fallbackMode
          ? 'Broadcast email logged to console successfully (SMTP credentials are not configured in .env yet).'
          : 'Match details emailed to all players successfully!',
        fallbackMode,
        sentCount: emails.length,
        recipientEmails: emails,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email broadcast error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send emails' },
      { status: 500 }
    );
  }
}
