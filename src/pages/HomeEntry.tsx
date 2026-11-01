import { lazy, Suspense } from "react";
import Lp3 from "./Lp3";
import { isBlackActive } from "@/lib/pricingSchedule";

const Black = lazy(() => import("./Black"));

/** Durante a Black (1–30/nov, Brasília) a página inicial mostra a Black; depois volta à LP3. */
export default function HomeEntry() {
  if (!isBlackActive()) return <Lp3 />;
  return (
    <Suspense fallback={<div className="dark min-h-screen bg-background" />}>
      <Black />
    </Suspense>
  );
}
