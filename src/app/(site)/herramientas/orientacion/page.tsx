import type { Metadata } from "next";
import { Orientation } from "@/components/tools/Orientation";

export const metadata: Metadata = { title: "¿Qué camino seguir?" };

export default function OrientacionPage() {
  return (
    <div className="container-page pt-8 pb-8 md:pt-12">
      <Orientation />
    </div>
  );
}
