"use client";
import { useEffect } from "react";

interface Props {
  onClose: () => void;
  children: React.ReactNode;
}

export default function ModalShell({ onClose, children }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 animate-fade-in"
        onClick={onClose}
      />
      {/* sheet */}
      <div className="relative bg-cream w-full max-w-lg rounded-t-2xl border-t-[3px] border-x-[3px] border-ink animate-slide-up max-h-[92dvh] overflow-y-auto scrollbar-hide">
        {/* handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-ink/20" />
        </div>
        {children}
      </div>
    </div>
  );
}
