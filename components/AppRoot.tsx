"use client";

import { useEffect, useState } from "react";
import { hydrateStore, useStore } from "@/lib/store";
import { ModelProvider } from "@/components/ModelProvider";
import Splash from "@/components/Splash";
import AppShell from "@/components/shell/AppShell";

export default function AppRoot() {
  const [hydrated, setHydrated] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    hydrateStore();
    if (useStore.persist.hasHydrated()) setHydrated(true);
    const unsubscribe = useStore.persist.onFinishHydration(() => setHydrated(true));
    return unsubscribe;
  }, []);

  if (!entered) {
    return <Splash hydrated={hydrated} onEnter={() => setEntered(true)} />;
  }

  return (
    <ModelProvider>
      <AppShell />
    </ModelProvider>
  );
}
