export type SendSmsResult = { sent: true } | { sent: false; reason: string };

/** Sends an SMS via the Twilio REST API. No SDK dependency — a single signed POST. */
export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { sent: false, reason: "Twilio is not configured." };
  }
  if (!to) {
    return { sent: false, reason: "Customer has no phone number on file." };
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: fromNumber, Body: body });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { sent: false, reason: data?.message || `Twilio request failed (${res.status}).` };
    }
    return { sent: true };
  } catch {
    return { sent: false, reason: "Could not reach Twilio." };
  }
}
