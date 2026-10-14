export function createPageMetadata({ title, description, path, locale = "pt_PT", image }) {
  const brandedTitle = `${title} | Vasto Império`;

  return {
    title: { absolute: brandedTitle },
    description,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    alternates: path ? { canonical: path } : undefined,
    openGraph: {
      title: brandedTitle,
      description,
      ...(path && { url: path }),
      siteName: "Vasto Império",
      locale,
      type: "website",
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: brandedTitle,
      description,
      ...(image && { images: [image] }),
    },
  };
}
