/**
 * Pesapal API 3.0 client.
 *
 * The flow, in order: ask for a bearer token, make sure an IPN URL is
 * registered (Pesapal will not accept an order without one), submit the order,
 * then send the person to the redirect_url it hands back. Pesapal calls the IPN
 * when the payment settles and returns the person to the callback URL.
 *
 * Credentials and the sandbox/live switch come from settings.ts: saved in the
 * dashboard, or PESAPAL_* in the environment.
 */

import "server-only";

import { pesapalConfig, type PesapalConfig } from "./settings";

const SANDBOX = "https://cybqa.pesapal.com/pesapalv3";
const LIVE = "https://pay.pesapal.com/v3";

function baseUrl(config: PesapalConfig): string {
  return config.env === "live" ? LIVE : SANDBOX;
}

export { pesapalConfigured } from "./settings";

export class PesapalError extends Error {}

type TokenResponse = { token?: string; error?: unknown; message?: string };

// Keyed by the credentials and environment, so changing either in the
// dashboard cannot keep serving a token from the old account.
let cached: { for: string; token: string; expiresAt: number } | null = null;

async function token(config: PesapalConfig): Promise<string> {
  if (!config.consumerKey || !config.consumerSecret) {
    throw new PesapalError("Pesapal credentials are not set.");
  }
  const fingerprint = `${config.env}:${config.consumerKey}:${config.consumerSecret}`;

  // Pesapal tokens last five minutes. Reuse one until a minute before it dies.
  if (cached && cached.for === fingerprint && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const res = await fetch(`${baseUrl(config)}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      consumer_key: config.consumerKey,
      consumer_secret: config.consumerSecret,
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.token) {
    throw new PesapalError(
      `Pesapal refused the credentials: ${data.message ?? JSON.stringify(data.error ?? data)}`,
    );
  }

  cached = { for: fingerprint, token: data.token, expiresAt: Date.now() + 4 * 60_000 };
  return data.token;
}

/**
 * Every call takes the company it is for, because each company may have its
 * own Pesapal account and the money has to reach the right one.
 */
async function call<T>(companyId: string, pathname: string, init: RequestInit): Promise<T> {
  const config = await pesapalConfig(companyId);
  const res = await fetch(`${baseUrl(config)}${pathname}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${await token(config)}`,
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

let cachedIpnId: { for: string; id: string } | null = null;

export async function ipnId(companyId: string, notificationUrl: string): Promise<string> {
  const config = await pesapalConfig(companyId);
  if (config.ipnId) return config.ipnId;

  const scope = `${config.env}:${config.consumerKey}:${notificationUrl}`;
  if (cachedIpnId && cachedIpnId.for === scope) return cachedIpnId.id;

  // Reuse a registration for this exact URL rather than piling up new ones.
  const existing = await call<IpnResponse[]>(companyId, "/api/URLSetup/GetIpnList", { method: "GET" }).catch(
    () => [] as IpnResponse[],
  );
  const match = Array.isArray(existing)
    ? existing.find((x) => x.url === notificationUrl)
    : undefined;
  if (match?.ipn_id) {
    cachedIpnId = { for: scope, id: match.ipn_id };
    return match.ipn_id;
  }

  const registered = await call<IpnResponse>(companyId, "/api/URLSetup/RegisterIPN", {
    method: "POST",
    body: JSON.stringify({ url: notificationUrl, ipn_notification_type: "POST" }),
  });
  cachedIpnId = { for: scope, id: registered.ipn_id };
  return registered.ipn_id;
}

export type SubmitOrder = {
  /** Whose Pesapal account the order goes through. */
  companyId: string;
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
    order.companyId,
    "/api/Transactions/SubmitOrderRequest",
    {
      method: "POST",
      body: JSON.stringify({
        id: order.merchantReference,
        currency: order.currency,
        amount: order.amount,
        description: order.description.slice(0, 100),
        callback_url: order.callbackUrl,
        notification_id: await ipnId(order.companyId, order.notificationUrl),
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

export async function transactionStatus(
  orderTrackingId: string,
  companyId: string,
): Promise<TransactionStatus> {
  const data = await call<{
    payment_method?: string;
    amount?: number;
    description?: string;
    status_code?: number;
    payment_status_description?: string;
    merchant_reference?: string;
  }>(
    companyId,
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
