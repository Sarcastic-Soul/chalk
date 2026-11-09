import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, shops, type Shop } from "@/lib/db";
import { getAccount } from "@/lib/buffer/queries";
import { getSession, type Session } from "@/lib/session";

export type Identity = { session: Session; accountId: string; orgId: string };

/**
 * The signed-in Buffer account. IDs are saved in the session at login; older
 * sessions fall back to one `account` query, deduped per request.
 */
export const getIdentity = cache(async (): Promise<Identity | null> => {
  const session = await getSession();
  if (!session) return null;
  if (session.accountId && session.orgId) {
    return { session, accountId: session.accountId, orgId: session.orgId };
  }
  const account = await getAccount(session.accessToken);
  const org = account.organizations[0];
  if (!org) return null;
  return { session, accountId: account.id, orgId: org.id };
});

export async function requireIdentity(): Promise<Identity> {
  const id = await getIdentity();
  if (!id) redirect("/");
  return id;
}

export const getShop = cache(async (accountId: string): Promise<Shop | null> => {
  const [shop] = await db().select().from(shops).where(eq(shops.bufferAccountId, accountId)).limit(1);
  return shop ?? null;
});

/** For pages and actions that need a set-up shop. Sends new users to setup. */
export async function requireShop(): Promise<{ identity: Identity; shop: Shop }> {
  const identity = await requireIdentity();
  const shop = await getShop(identity.accountId);
  if (!shop) redirect("/app/setup");
  return { identity, shop };
}

/** Action-safe variant: returns null instead of redirecting. */
export async function currentShop(): Promise<{ identity: Identity; shop: Shop } | null> {
  const identity = await getIdentity();
  if (!identity) return null;
  const shop = await getShop(identity.accountId);
  return shop ? { identity, shop } : null;
}
