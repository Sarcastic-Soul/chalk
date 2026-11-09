import { beforeEach, describe, expect, it } from "vitest";
import { v2 as cloudinary } from "cloudinary";
import { feedImageUrl, isValidPublicId, signUpload } from "./cloudinary";

beforeEach(() => {
  process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
  process.env.CLOUDINARY_API_KEY = "key-1";
  process.env.CLOUDINARY_API_SECRET = "secret-1";
});

describe("isValidPublicId", () => {
  it("accepts ids in our upload folder only", () => {
    expect(isValidPublicId("chalk/uploads/abc_DEF-123")).toBe(true);
    expect(isValidPublicId("other/abc")).toBe(false);
    expect(isValidPublicId("chalk/uploads/../secret")).toBe(false);
    expect(isValidPublicId("chalk/uploads/a/b")).toBe(false);
    expect(isValidPublicId("")).toBe(false);
  });
});

describe("feedImageUrl", () => {
  it("returns a public 4:5 JPEG URL", () => {
    expect(feedImageUrl("chalk/uploads/abc")).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/c_fill,g_auto,ar_4:5,w_1080,f_jpg,q_auto/chalk/uploads/abc.jpg",
    );
  });

  it("rejects ids outside our folder", () => {
    expect(() => feedImageUrl("someone/else")).toThrow();
  });
});

describe("signUpload", () => {
  it("signs folder, formats and timestamp without exposing the secret", () => {
    const sig = signUpload(1_700_000_000_000);
    expect(sig.timestamp).toBe(1_700_000_000);
    expect(sig.signature).toBe(
      cloudinary.utils.api_sign_request(
        { allowed_formats: sig.allowedFormats, folder: "chalk/uploads", timestamp: sig.timestamp },
        "secret-1",
      ),
    );
    expect(JSON.stringify(sig)).not.toContain("secret-1");
  });
});
