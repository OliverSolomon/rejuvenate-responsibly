/**
 * Pesapal API 3.0 client.
 *
 * The flow, in order: ask for a bearer token, make sure an IPN URL is
 * registered (Pesapal will not accept an order without one), submit the order,
 * then send the person to the redirect_url it hands back. Pesapal calls the IPN
 * when the payment settles and returns the person to the callback URL.
 *
 * Set PESAPAL_ENV=live to move off the sandbox.
 */

const SANDBOX = "https://cybqa.pesapal.com/pesapalv3";
const LIVE = "https://pay.pesapal.com/v3";

function baseUrl(): string {
  return process.env.PESAPAL_ENV === "live" ? LIVE : SANDBOX;
}

export function pesapalConfigured(): boolean {
  return Boolean(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET);
}

export class PesapalError extends Error {}

type TokenResponse = { token?: string; error?: unknown; message?: string };

let cached: { token: string; expiresAt: number } | null = null;

async function token(): Promise<string> {
  // Pesapal tokens last five minutes. Reuse one until a minute before it dies.
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch(`${baseUrl()}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.token) {
    throw new PesapalError(
      `Pesapal refused the credentials: ${data.message ?? JSON.stringify(data.error ?? data)}`,
    );
  }

  cached = { token: data.token, expiresAt: Date.now() + 4 * 60_000 };
  return data.token;
}

async function call<T>(pathname: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${pathname}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${await token()}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new PesapalError(`Pesapal returned something that is not JSON: ${text.slice(0, 200)}`);
  }

  const asRecord = data as { error?: { message?: string; code?: string } | null };
  if (!res.ok || (asRecord.error && Object.keys(asRecord.error).length > 0)) {
    throw new PesapalError(
      asRecord.error?.message ?? `Pesapal rejected the request (${res.status})`,
    );
  }
  return data as T;
}

/* -------------------------------------------------------------------------- */

type IpnResponse = { ipn_id: string; url: string };

let cachedIpnId: string | null = null;

export async function ipnId(notificationUrl: string): Promise<string> {
  if (process.env.PESAPAL_IPN_ID) return process.env.PESAPAL_IPN_ID;
  if (cachedIpnId) return cachedIpnId;

  // Reuse a registration for this exact URL rather than piling up new ones.
  const existing = await call<IpnResponse[]>("/api/URLSetup/GetIpnList", { method: "GET" }).catch(
    () => [] as IpnResponse[],
  );
  const match = Array.isArray(existing)
    ? existing.find((x) => x.url === notificationUrl)
    : undefined;
  if (match?.ipn_id) {
    cachedIpnId = match.ipn_id;
    return match.ipn_id;
  }

  const registered = await call<IpnResponse>("/api/URLSetup/RegisterIPN", {
    method: "POST",
    body: JSON.stringify({ url: notificationUrl, ipn_notification_type: "POST" }),
  });
  cachedIpnId = registered.ipn_id;
  return registered.ipn_id;
}

export type SubmitOrder = {
  merchantReference: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  notificationUrl: string;
  billing: { email: string; firstName?: string; lastName?: string; phone?: string };
};

export type SubmittedOrder = { orderTrackingId: string; redirectUrl: string };

export async function submitOrder(order: SubmitOrder): Promise<SubmittedOrder> {
  const data = await call<{ order_tracking_id: string; redirect_url: string }>(
    "/api/Transactions/SubmitOrderRequest",
    {
      method: "POST",
      body: JSON.stringify({
        id: order.merchantReference,
        currency: order.currency,
        amount: order.amount,
        description: order.description.slice(0, 100),
        callback_url: order.callbackUrl,
        notification_id: await ipnId(order.notificationUrl),
        billing_address: {
          email_address: order.billing.email,
          phone_number: order.billing.phone ?? "",
          first_name: order.billing.firstName ?? "",
          last_name: order.billing.lastName ?? "",
        },
      }),
    },
  );

  return { orderTrackingId: data.order_tracking_id, redirectUrl: data.redirect_url };
}

export type TransactionStatus = {
  paymentMethod: string | null;
  amount: number | null;
  description: string | null;
  /** 0 invalid, 1 completed, 2 failed, 3 reversed. */
  statusCode: number;
  status: "unpaid" | "paid" | "failed" | "pending";
  merchantReference: string | null;
};

export async function transactionStatus(orderTrackingId: string): Promise<TransactionStatus> {
  const data = await call<{
    payment_method?: string;
    amount?: number;
    description?: string;
    status_code?: number;
    payment_status_description?: string;
    merchant_reference?: string;
  }>(
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    { method: "GET" },
  );

  const code = data.status_code ?? 0;
  const status =
    code === 1 ? "paid" : code === 2 || code === 3 ? "failed" : code === 0 ? "pending" : "pending";

  return {
    paymentMethod: data.payment_method ?? null,
    amount: data.amount ?? null,
    description: data.payment_status_description ?? data.description ?? null,
    statusCode: code,
    status,
    merchantReference: data.merchant_reference ?? null,
  };
}
