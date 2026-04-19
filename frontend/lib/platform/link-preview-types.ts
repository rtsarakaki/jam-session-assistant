/** Serializable link preview (Open Graph–style); safe to pass to the client. */
export type LinkPreviewData = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};
