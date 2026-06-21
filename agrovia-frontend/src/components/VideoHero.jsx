import { useEffect, useState } from 'react';

// Drop MP4 files into /public/hero/1.mp4 … /public/hero/4.mp4.
// The component silently falls back to the CSS gradient if any video fails to load.
const VIDEO_SRCS = ['/hero/1.mp4', '/hero/2.mp4', '/hero/3.mp4', '/hero/4.mp4'];
const ADVANCE_MS = 3500;

export default function VideoHero({ children }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hasVideo, setHasVideo] = useState(true);

  useEffect(() => {
    if (!hasVideo) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % VIDEO_SRCS.length);
      setLoaded(false);
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, [hasVideo]);

  return (
    <section className="relative isolate min-h-[580px] overflow-hidden bg-hero-radial text-white lg:min-h-[680px]">
      {hasVideo ? (
        <video
          key={VIDEO_SRCS[index]}
          src={VIDEO_SRCS[index]}
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setLoaded(true)}
          onError={() => setHasVideo(false)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            loaded ? 'opacity-40 dark:opacity-25' : 'opacity-0'
          }`}
        />
      ) : null}

      {/* Directional gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#08111d]/92 via-[#0B1A14]/65 to-[#0B1A14]/15" />

      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-[540px] w-[540px] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-[380px] w-[380px] rounded-full bg-amber-500/[0.07] blur-3xl" />

      {/* Slot for hero content */}
      <div className="section-shell relative py-20 lg:py-28">
        {children}
      </div>

      {/* Dot pagination — only shown when video files are present */}
      {hasVideo ? (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {VIDEO_SRCS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setIndex(i); setLoaded(false); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Video ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
