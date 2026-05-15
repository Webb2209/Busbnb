/**
 * src/services/mpesa.service.ts
 * Safaricom Daraja API — STK Push integration.
 *
 * Credentials are read from env vars. Set MPESA_ENV=sandbox for testing.
 * When credentials are not yet configured, functions are no-ops that log a warning.
 *
 * Daraja docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 */
import { env } from '../config/env';

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE = 'https://api.safaricom.co.ke';

function baseUrl(): string {
  return env.MPESA_ENV === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;
}

function credentialsConfigured(): boolean {
  return !!(env.MPESA_CONSUMER_KEY && env.MPESA_CONSUMER_SECRET && env.MPESA_PASSKEY);
}

// ─── Get OAuth Token ──────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`,
  ).toString('base64');

  const response = await fetch(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: 'GET',
      headers: { Authorization: `Basic ${credentials}` },
    },
  );

  if (!response.ok) {
    throw new Error(`M-Pesa OAuth failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// ─── Generate Password ────────────────────────────────────────────────────────

function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14); // YYYYMMDDHHmmss

  const raw = `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`;
  const password = Buffer.from(raw).toString('base64');
  return { password, timestamp };
}

// ─── STK Push ─────────────────────────────────────────────────────────────────

export interface StkPushParams {
  phone: string;      // Format: 254712345678
  amount: number;
  bookingRef: string; // Used as AccountReference
}

export interface StkPushResult {
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function initiateStkPush(params: StkPushParams): Promise<StkPushResult | null> {
  if (!credentialsConfigured()) {
    console.warn('[M-Pesa] Credentials not configured — STK push skipped (dev mode)');
    return null;
  }

  const accessToken = await getAccessToken();
  const { password, timestamp } = generatePassword();

  // Normalize phone: strip leading 0 and prepend 254
  const phone = params.phone.replace(/^0/, '254').replace(/\s/g, '');

  const body = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.ceil(params.amount), // M-Pesa requires whole numbers
    PartyA: phone,
    PartyB: env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: env.MPESA_CALLBACK_SECRET 
      ? `${env.MPESA_CALLBACK_URL}?secret=${env.MPESA_CALLBACK_SECRET}` 
      : env.MPESA_CALLBACK_URL,
    AccountReference: params.bookingRef,
    TransactionDesc: `BusBnB Ticket — ${params.bookingRef}`,
  };

  const response = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`STK Push failed: ${err}`);
  }

  return response.json() as Promise<StkPushResult>;
}

// ─── Parse Callback ───────────────────────────────────────────────────────────

export interface ParsedMpesaCallback {
  success: boolean;
  resultCode: number;
  resultDesc: string;
  mpesaRef?: string;         // M-Pesa transaction ID (only on success)
  checkoutRequestId?: string;
  amount?: number;
  phone?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMpesaCallback(body: any): ParsedMpesaCallback {
  const stk = body?.Body?.stkCallback;
  if (!stk) {
    return { success: false, resultCode: -1, resultDesc: 'Malformed callback body' };
  }

  const resultCode: number = stk.ResultCode;
  const resultDesc: string = stk.ResultDesc;
  const checkoutRequestId: string = stk.CheckoutRequestID;

  if (resultCode !== 0) {
    return { success: false, resultCode, resultDesc, checkoutRequestId };
  }

  // Extract items from CallbackMetadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = stk.CallbackMetadata?.Item ?? [];
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;

  return {
    success: true,
    resultCode,
    resultDesc,
    checkoutRequestId,
    mpesaRef: get('MpesaReceiptNumber'),
    amount: get('Amount'),
    phone: String(get('PhoneNumber') ?? ''),
  };
}
