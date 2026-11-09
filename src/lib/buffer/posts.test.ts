import { describe, expect, it } from "vitest";
import { buildCreatePostInput, metadataFor, type PostDraft } from "./posts";

const base: PostDraft = {
  channelId: "ch1",
  service: "instagram",
  text: "Pumpkin loaf is back",
  imageUrl: "https://res.cloudinary.com/demo/image/upload/x.jpg",
  altText: "Pumpkin loaf",
  mode: "shareNow",
  preview: true,
};

describe("buildCreatePostInput", () => {
  it("builds an Instagram feed post with one image and alt text", () => {
    const input = buildCreatePostInput(base);
    expect(input).toMatchObject({
      channelId: "ch1",
      text: "Pumpkin loaf is back",
      schedulingType: "automatic",
      mode: "shareNow",
      saveToDraft: true,
      metadata: { instagram: { type: "post", shouldShareToFeed: true } },
    });
    expect(input.assets).toEqual([
      { image: { url: base.imageUrl, metadata: { altText: "Pumpkin loaf" } } },
    ]);
    expect(input).not.toHaveProperty("dueAt");
  });

  it("omits metadata for services without special needs", () => {
    expect(buildCreatePostInput({ ...base, service: "threads" })).not.toHaveProperty("metadata");
    expect(metadataFor("unknown-network")).toBeUndefined();
  });

  it("requires dueAt for custom scheduled posts", () => {
    expect(() => buildCreatePostInput({ ...base, mode: "customScheduled" })).toThrow(/dueAt/);
    const at = "2026-11-12T09:00:00.000Z";
    expect(buildCreatePostInput({ ...base, mode: "customScheduled", dueAt: at }).dueAt).toBe(at);
  });

  it("publishes for real only when preview is off", () => {
    expect(buildCreatePostInput({ ...base, preview: false }).saveToDraft).toBe(false);
  });
});
