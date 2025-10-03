"use client";
import dynamic from "next/dynamic";

const WindowLoaderOverlay = dynamic(() => import("@/components/WindowLoaderOverlay"), { ssr: false });

export default WindowLoaderOverlay;