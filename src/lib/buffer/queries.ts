import "server-only";
import { cache } from "react";
import { bufferGraphQL } from "@/lib/buffer/client";

export type Organization = { id: string; name: string };

export type Channel = {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
  avatar: string;
  isDisconnected: boolean;
  isLocked: boolean;
};

const ACCOUNT_QUERY = /* GraphQL */ `
  query Account {
    account {
      id
      email
      organizations {
        id
        name
      }
    }
  }
`;

const CHANNELS_QUERY = /* GraphQL */ `
  query Channels($organizationId: OrganizationId!) {
    channels(input: { organizationId: $organizationId }) {
      id
      name
      displayName
      service
      avatar
      isDisconnected
      isLocked
    }
  }
`;

// `cache` dedupes calls within one request, which keeps us inside the shared rate limit.
export const getAccount = cache(async (accessToken: string) => {
  const data = await bufferGraphQL<{
    account: { id: string; email: string; organizations: Organization[] };
  }>(accessToken, ACCOUNT_QUERY);
  return data.account;
});

export const getChannels = cache(async (accessToken: string, organizationId: string) => {
  const data = await bufferGraphQL<{ channels: Channel[] }>(accessToken, CHANNELS_QUERY, {
    organizationId,
  });
  return data.channels;
});
