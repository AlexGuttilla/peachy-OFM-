"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keeps the live board current without the user pulling to refresh. */
export default function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      // No point re-fetching while the phone is in a pocket.
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);

  return null;
}
