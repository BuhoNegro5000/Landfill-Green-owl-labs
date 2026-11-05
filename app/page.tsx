"use client";

import dynamic from "next/dynamic";

const AppRoot = dynamic(() => import("@/components/AppRoot"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#03110b",
        display: "grid",
        placeItems: "center",
        color: "#79CE4C",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      Green Owl Labs · inicializando
    </div>
  ),
});

export default function Page() {
  return <AppRoot />;
}
