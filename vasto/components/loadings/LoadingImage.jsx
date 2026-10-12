"use client";

import Image from "next/image";
import { useState } from "react";

export default function LoadingImage({ className = "", fill = false, width, height, onLoad, onError, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const hasLayoutSizing = /\b(?:w-|h-|max-w-|max-h-|min-w-|min-h-|aspect-)/.test(className);
  const zIndexClass = className.match(/(?:^|\s)z-(\d+)(?:\s|$)/)?.[1];
  const position = /(?:^|\s)fixed(?:\s|$)/.test(className)
    ? "fixed"
    : /(?:^|\s)absolute(?:\s|$)/.test(className)
      ? "absolute"
      : undefined;
  const frameStyle = {
    ...(!fill && !hasLayoutSizing && width && height ? { width, height } : {}),
    ...(fill ? { zIndex: zIndexClass ? Number(zIndexClass) : undefined } : position ? { position, zIndex: zIndexClass ? Number(zIndexClass) : undefined } : {}),
  };

  function handleLoad(event) {
    setLoaded(true);
    onLoad?.(event);
  }

  function handleError(event) {
    setLoaded(true);
    onError?.(event);
  }

  return (
    <span
      className={`loading-image-frame ${fill ? "loading-image-frame-fill" : `loading-image-frame-intrinsic ${className}`}`}
      style={frameStyle}
    >
      <Image
        {...props}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        onLoad={handleLoad}
        onError={handleError}
        className={className}
      />
      {!loaded && (
        <span className="loading-image-indicator" aria-hidden="true">
          <span className="loading-spinner" />
        </span>
      )}
    </span>
  );
}
