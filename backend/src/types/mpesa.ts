/**
 * src/types/mpesa.ts
 * Typed interfaces for Safaricom Daraja M-Pesa STK Push callback payloads.
 *
 * Reference:
 *  https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 */

interface CallbackMetadataItem {
  Name: 'MpesaReceiptNumber' | 'Amount' | 'Balance' | 'TransactionDate' | 'PhoneNumber';
  Value?: string | number;
}

interface StkCallback {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  /** Present only when ResultCode === 0 */
  CallbackMetadata?: {
    Item: CallbackMetadataItem[];
  };
}

export interface SafaricomCallbackBody {
  Body: {
    stkCallback: StkCallback;
  };
}
