/**
 * src/services/email.service.ts
 * Sends ticket confirmation emails via Resend.
 * No-ops gracefully when RESEND_API_KEY is not configured.
 */
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface TicketEmailParams {
  to: string;
  fullName: string;
  bookingRef: string;
  tripSummary: {
    origin: string;
    destination: string;
    departure: string;
    operator: string;
    seats: string[];
    totalAmount: number;
  };
}

function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

function buildHtml(p: TicketEmailParams): string {
  const { tripSummary: t } = p;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Your BusBnB Ticket</title></head>
<body style="font-family:sans-serif;background:#f9fafb;padding:32px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <!-- Header -->
    <div style="background:#f43f5e;padding:24px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px">🚌 busbnb</h1>
      <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px">Your ticket is confirmed</p>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <p style="color:#374151;font-size:15px;margin:0 0 24px">Hi <strong>${p.fullName}</strong>,</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px">Your booking is confirmed. Show the QR code or booking reference at the bus.</p>

      <!-- Booking ref -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:24px">
        <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px">Booking Reference</p>
        <p style="font-size:22px;font-weight:700;color:#111827;margin:0;letter-spacing:0.05em">${p.bookingRef}</p>
      </div>

      <!-- Trip details -->
      <table style="width:100%;border-collapse:collapse">
        ${[
          ['Route', `${t.origin} → ${t.destination}`],
          ['Departure', t.departure],
          ['Operator', t.operator],
          ['Seats', t.seats.join(', ')],
          ['Total Paid', formatKES(t.totalAmount)],
        ]
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:40%">${label}</td>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:600;text-align:right">${value}</td>
          </tr>`,
          )
          .join('')}
      </table>

      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">Please arrive at the bus stop 15 minutes before departure.</p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6">
      <p style="color:#9ca3af;font-size:11px;margin:0">© ${new Date().getFullYear()} BusBnB. Powered by Safaricom M-Pesa.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendTicketEmail(params: TicketEmailParams): Promise<void> {
  if (!env.RESEND_API_KEY || env.RESEND_API_KEY === 'FILL_IN_LATER') {
    console.warn(`[Email] RESEND_API_KEY not configured — ticket email skipped for ${params.to}`);
    console.info(`[Email] Would have sent ticket ${params.bookingRef} to ${params.to}`);
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: `Your BusBnB Ticket — ${params.bookingRef}`,
    html: buildHtml(params),
  });

  if (error) {
    // Non-fatal — booking is already confirmed. Log and continue.
    logger.error({ error }, '[Email] Failed to send ticket email');
  } else {
    logger.info(`[Email] Ticket sent to ${params.to} (ref: ${params.bookingRef})`);
  }
}

export async function sendNewOperatorNotification(companyName: string, contactName: string, email: string): Promise<void> {
  if (!env.RESEND_API_KEY || env.RESEND_API_KEY === 'FILL_IN_LATER') {
    logger.warn(`[Email] RESEND_API_KEY not configured — admin operator notification skipped for ${companyName}`);
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: 'tickets@busbnb.co.ke', // Replace with actual admin team email
    subject: `🚨 New Operator Signed Up: ${companyName}`,
    html: `
      <h2>New Operator Application</h2>
      <p>A new operator has just created an account via the self-serve signup flow.</p>
      <ul>
        <li><strong>Company Name:</strong> ${companyName}</li>
        <li><strong>Contact Name:</strong> ${contactName}</li>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
      <p>They are now logged in and can begin setting up their buses and trips.</p>
    `,
  });

  if (error) {
    logger.error({ error }, '[Email] Failed to send operator notification email');
  } else {
    logger.info(`[Email] Operator notification sent for ${companyName}`);
  }
}
