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

export type CreatePostResult =
  | { ok: true; post: CreatedPost }
  | { ok: false; kind: string; message: string };

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
  if ("post" in payload) return { ok: true, post: payload.post };
  return { ok: false, kind: payload.__typename, message: payload.message };
}
