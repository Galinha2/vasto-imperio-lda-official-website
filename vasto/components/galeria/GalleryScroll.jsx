"use client";
import Image from "next/image";

export default function GalleryScroll({ images }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="overflow-hidden relative -mx-5 md:-mx-10">
      <div className="flex animate-scroll-horizontal gap-4 py-2">
        {images.concat(images).map((img, idx) => (
          <Image
            key={idx}
            src={img}
            alt={`Cliente ${idx + 1}`}
            width={200}
            height={150}
            className="rounded-[35px] w-100 shadow flex-shrink-0"
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes scroll-horizontal {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll-horizontal {
          display: flex;
          animation: scroll-horizontal 20s linear infinite;
          width: max-content;
        }
      `}</style>
    </div>
  );
}