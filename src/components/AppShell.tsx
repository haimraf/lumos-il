"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import AnnouncementBanner from "@/components/AnnouncementBanner";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() || "";
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const [headerOffset, setHeaderOffset] = useState(120);

  useEffect(() => {
    if (isDashboardRoute) {
      setHeaderOffset(0);
      return;
    }

    const header = document.querySelector("header");
    if (!(header instanceof HTMLElement)) return;

    const syncHeight = () => setHeaderOffset(header.offsetHeight || 120);
    syncHeight();

    const resizeObserver = new ResizeObserver(syncHeight);
    resizeObserver.observe(header);
    window.addEventListener("resize", syncHeight);
    window.addEventListener("scroll", syncHeight, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncHeight);
      window.removeEventListener("scroll", syncHeight);
    };
  }, [isDashboardRoute]);

  return (
    <>
      <Header />

      <div
        className="relative flex w-full flex-1 flex-col"
        style={isDashboardRoute ? undefined : { paddingTop: `${headerOffset}px` }}
      >
        <AnnouncementBanner />

        <main id="main-content" className="flex flex-1 w-full flex-col pt-6 md:pt-8">
          {children}
        </main>
      </div>
    </>
  );
}
