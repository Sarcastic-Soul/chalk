"use server";

import { z } from "zod";
import { BufferApiError } from "@/lib/buffer/client";
import { createPost } from "@/lib/buffer/posts";
import { getAccount, getChannels } from "@/lib/buffer/queries";
import { feedImageUrl, isValidPublicId, signUpload, type UploadSignature } from "@/lib/media/cloudinary";
import { getSession } from "@/lib/session";

export type ComposeState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "sent"; preview: boolean; postStatus: string; dueAt: string | null };

const schema = z.object({
  channelId: z.string().min(1, "Pick a channel."),
  publicId: z.string().refine(isValidPublicId, "Add a photo first."),
  text: z.string().trim().min(1, "Write a caption.").max(2200, "Instagram captions max out at 2,200 characters."),
  altText: z.string().trim().max(1000).default(""),
  when: z.enum(["now", "queue"]),
  preview: z.boolean(),
});

export async function getUploadSignature(): Promise<UploadSignature | null> {
  // Only signed-in users may upload to our Cloudinary account.
  if (!(await getSession())) return null;
  return signUpload();
}

export async function submitPost(_prev: ComposeState, form: FormData): Promise<ComposeState> {
  const session = await getSession();
  if (!session) return { status: "error", message: "Your session ended. Reconnect Buffer and try again." };

  const parsed = schema.safeParse({
    channelId: form.get("channelId"),
    publicId: form.get("publicId"),
    text: form.get("text"),
    altText: form.get("altText") ?? "",
    when: form.get("when"),
    preview: form.get("preview") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const input = parsed.data;

  try {
    // Re-check the channel belongs to this user rather than trusting the form.
    const account = await getAccount(session.accessToken);
    const channels = (
      await Promise.all(account.organizations.map((o) => getChannels(session.accessToken, o.id)))
    ).flat();
    const channel = channels.find((c) => c.id === input.channelId);
    if (!channel || channel.isDisconnected || channel.isLocked) {
      return { status: "error", message: "That channel isn't available. Check it in Buffer." };
    }

    const result = await createPost(session.accessToken, {
      channelId: channel.id,
      service: channel.service,
      text: input.text,
      imageUrl: feedImageUrl(input.publicId),
      altText: input.altText || input.text.slice(0, 120),
      mode: input.when === "now" ? "shareNow" : "addToQueue",
      preview: input.preview,
    });

    if (!result.ok) return { status: "error", message: `Buffer said: ${result.message}` };
    return {
      status: "sent",
      preview: input.preview,
      postStatus: result.post.status,
      dueAt: result.post.dueAt,
    };
  } catch (err) {
    if (err instanceof BufferApiError) {
      if (err.isRateLimited) {
        return { status: "error", message: "Buffer is busy right now. Wait a minute and try again." };
      }
      if (err.isUnauthorized) {
        return { status: "error", message: "Your Buffer connection expired. Reconnect and try again." };
      }
      return { status: "error", message: `Buffer said: ${err.message}` };
    }
    console.error("submitPost failed", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
