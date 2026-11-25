"use client";

import { useEffect, useRef, useState } from "react";

// Oficjalny odtwarzacz YouTube montowany tylko wtedy, gdy karta jest blisko widocznego obszaru.
// Dzięki temu na telefonie nie ma jednocześnie kilkudziesięciu odtwarzaczy (zużywały całą pamięć Safari).
export function VideoEmbed({ videoId, title }: { videoId: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      rootMargin: "300px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-4 aspect-video overflow-hidden rounded-xl bg-border">
      {near && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          title={title}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      )}
    </div>
  );
}
