"use client";

import { useState } from "react";
import { Interview } from "./Interview";
import { Wizard } from "./Wizard";

/**
 * Cada herramienta se puede usar de dos maneras con los mismos datos:
 * como conversación (una pregunta a la vez) o como formulario tradicional.
 */
export function ToolRunner({ kind }: { kind: string }) {
  const [mode, setMode] = useState<"conversacion" | "formulario">("conversacion");
  return mode === "conversacion" ? (
    <Interview kind={kind} onSwitch={() => setMode("formulario")} />
  ) : (
    <Wizard kind={kind} onSwitch={() => setMode("conversacion")} />
  );
}
