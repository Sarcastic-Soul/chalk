import "server-only";
import { bufferGraphQL } from "@/lib/buffer/client";

export type ShareMode = "shareNow" | "addToQueue" | "customScheduled" | "shareNext";

export type PostDraft = {
  channelId: string;
  service: string;
  text: string;
  imageUrl: string;
  altText: string;
  mode: ShareMode;
  /** ISO time, required when mode is customScheduled. */
  dueAt?: string;
  /** Save as a Buffer draft instead of publishing. */
  preview: boolean;
};

export type CreatedPost = {
  id: string;
  status: string;
  dueAt: string | null;
};

export type MutationResult<T> = { ok: true; value: T } | { ok: false; kind: string; message: string };
export type CreatePostResult = MutationResult<CreatedPost>;

const CREATE_POST = /* GraphQL */ `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      __typename
      ... on PostActionSuccess {
        post {
          id
          status
          dueAt
        }
      }
      ... on MutationError {
        message
      }
    }
  }
`;

const DELETE_POST = /* GraphQL */ `
  mutation DeletePost($input: DeletePostInput!) {
    deletePost(input: $input) {
      __typename
      ... on DeletePostSuccess {
        id
      }
      ... on VoidMutationError {
        message
      }
    }
  }
`;

const SCHEDULED_POSTS = /* GraphQL */ `
  query ScheduledPosts($input: PostsInput!) {
    posts(input: $input, first: 50) {
      edges {
        node {
          id
          text
          dueAt
          channelId
          status
        }
      }
    }
  }
`;

/**
 * Network-specific metadata, keyed by the channel's `service`. Unknown
 * services get none and fall back to plain text plus image.
 */
export function metadataFor(service: string): Record<string, unknown> | undefined {
  switch (service) {
    case "instagram":
      return { instagram: { type: "post", shouldShareToFeed: true } };
    default:
      return undefined;
  }
}

export function buildCreatePostInput(draft: PostDraft): Record<string, unknown> {
  const input: Record<string, unknown> = {
    channelId: draft.channelId,
    text: draft.text,
    schedulingType: "automatic",
    mode: draft.mode,
    saveToDraft: draft.preview,
    assets: [{ image: { url: draft.imageUrl, metadata: { altText: draft.altText } } }],
  };
  const metadata = metadataFor(draft.service);
  if (metadata) input.metadata = metadata;
  if (draft.mode === "customScheduled") {
    if (!draft.dueAt) throw new Error("dueAt is required for customScheduled posts");
    input.dueAt = draft.dueAt;
  }
  return input;
}

type CreatePostResponse = {
  createPost:
    | { __typename: "PostActionSuccess"; post: CreatedPost }
    | { __typename: string; message: string };
};

/** Buffer reports business errors in the payload, not as GraphQL errors. */
export async function createPost(accessToken: string, draft: PostDraft): Promise<CreatePostResult> {
  const data = await bufferGraphQL<CreatePostResponse>(accessToken, CREATE_POST, {
    input: buildCreatePostInput(draft),
  });
  const payload = data.createPost;
  if ("post" in payload) return { ok: true, value: payload.post };
  return { ok: false, kind: payload.__typename, message: payload.message };
}

/** Deleting a post that's already gone counts as success. */
export async function deletePost(accessToken: string, id: string): Promise<MutationResult<string>> {
  const data = await bufferGraphQL<{
    deletePost: { __typename: string; id?: string; message?: string };
  }>(accessToken, DELETE_POST, { input: { id } });
  const p = data.deletePost;
  if (p.__typename === "DeletePostSuccess") return { ok: true, value: id };
  if (/not found/i.test(p.message ?? "")) return { ok: true, value: id };
  return { ok: false, kind: p.__typename, message: p.message ?? "Buffer couldn't remove the post." };
}

export type QueuedPost = { id: string; text: string; dueAt: string | null; channelId: string };

/** Scheduled posts in Buffer between two instants, for the given channels. */
export async function scheduledPosts(
  accessToken: string,
  organizationId: string,
  channelIds: string[],
  start: Date,
  end: Date,
): Promise<QueuedPost[]> {
  const data = await bufferGraphQL<{ posts: { edges: { node: QueuedPost & { status: string } }[] } }>(
    accessToken,
    SCHEDULED_POSTS,
    {
      input: {
        organizationId,
        filter: {
          channelIds,
          status: ["scheduled"],
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
    },
  );
  return data.posts.edges
    .map((e) => e.node)
    .filter((p) => p.status === "scheduled" && p.dueAt && new Date(p.dueAt) >= start && new Date(p.dueAt) < end);
}

/** True if a post's text is about the product (whole-word, case-insensitive). */
export function mentions(text: string, productName: string): boolean {
  const name = productName.trim().toLowerCase();
  if (!name) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(text);
}

/** Friendly wording for Buffer's typed mutation errors. */
export function explainError(kind: string, message: string): string {
  switch (kind) {
    case "LimitReachedError":
      return `Buffer's queue is full for this channel (${message}). Free plans hold 10 scheduled posts. Chalk keeps this one and you can push it later.`;
    case "UnauthorizedError":
      return "Buffer says this account can't post to that channel. Check the channel in Buffer.";
    case "InvalidInputError":
      return `Buffer rejected the post: ${message}`;
    default:
      return `Buffer said: ${message}`;
  }
}
