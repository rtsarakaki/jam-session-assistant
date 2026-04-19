import { describe, expect, it } from "vitest";
import { googleDrivePreviewEmbedSrc, parseGoogleDriveFileId } from "@/lib/validation/google-drive-url";

const FID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqftlbs";

describe("parseGoogleDriveFileId", () => {
  it("parses /file/d/…/view", () => {
    expect(parseGoogleDriveFileId(`https://drive.google.com/file/d/${FID}/view?usp=sharing`)).toBe(FID);
  });

  it("parses /file/u/0/d/…", () => {
    expect(parseGoogleDriveFileId(`https://drive.google.com/file/u/0/d/${FID}/view`)).toBe(FID);
  });

  it("parses /open?id=", () => {
    expect(parseGoogleDriveFileId(`https://drive.google.com/open?id=${FID}`)).toBe(FID);
  });

  it("parses docs.google.com/uc", () => {
    expect(parseGoogleDriveFileId(`https://docs.google.com/uc?export=download&id=${FID}`)).toBe(FID);
  });

  it("returns null for folders or other hosts", () => {
    expect(parseGoogleDriveFileId(`https://drive.google.com/drive/folders/${FID}`)).toBeNull();
    expect(parseGoogleDriveFileId("https://example.com/file.txt")).toBeNull();
  });
});

describe("googleDrivePreviewEmbedSrc", () => {
  it("builds preview URL", () => {
    expect(googleDrivePreviewEmbedSrc(FID)).toBe(`https://drive.google.com/file/d/${FID}/preview`);
  });
});
