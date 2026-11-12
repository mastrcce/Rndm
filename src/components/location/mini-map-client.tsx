"use client";

import dynamic from "next/dynamic";

export const MiniMapClient = dynamic(() => import("./mini-map"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-sage-100 lg:h-72" />,
});
