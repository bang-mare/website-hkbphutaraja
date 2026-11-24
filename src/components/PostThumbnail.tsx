import { useState } from 'react';
import { Newspaper } from 'lucide-react';

export function PostThumbnail({
  src,
  alt,
  categoryLabel,
  className = 'aspect-[16/10]',
}: {
  src?: string;
  alt: string;
  categoryLabel?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#0f294a] via-[#173b6c] to-[#1e3a8a] ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-white/90 select-none">
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-2">
            <Newspaper className="w-5 h-5 text-[#fbbf24]" />
          </div>
          <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#fbbf24]">
            {categoryLabel || 'Publikasi Huria'}
          </span>
        </div>
      )}
      {categoryLabel && showImage && (
        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-[#0f294a]/85 text-white text-[10px] font-semibold uppercase tracking-[0.06em]">
          {categoryLabel}
        </span>
      )}
    </div>
  );
}
