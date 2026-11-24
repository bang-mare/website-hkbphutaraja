import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface WpPostboxProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
}

export function WpPostbox({
  title,
  children,
  defaultOpen = true,
  headerRight,
}: WpPostboxProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#c3c4c7]">
        <h2 className="text-[14px] font-semibold text-[#1d2327] leading-snug">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {headerRight}
          <button
            type="button"
            onClick={() => setIsOpen((o) => !o)}
            aria-expanded={isOpen}
            aria-label={isOpen ? `Ciutkan kotak ${title}` : `Bentangkan kotak ${title}`}
            className="p-1 text-[#787c82] hover:text-[#1d2327] cursor-pointer rounded"
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      {isOpen && <div className="p-3">{children}</div>}
    </section>
  );
}
