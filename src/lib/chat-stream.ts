import type { ChatEvent } from "./constants";

/** Una conexión cortada sin evento done no es una respuesta terminada. */
export async function readChatStream(body: ReadableStream<Uint8Array>, onEvent: (event: ChatEvent) => void, onActivity: () => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let complete = false;
  const line = (text: string) => {
    if (!text.trim()) return;
    const event = JSON.parse(text) as ChatEvent;
    if (event.type === "done") complete = true;
    onEvent(event);
  };
  try {
    while (!complete) {
      const { done, value } = await reader.read();
      if (done) { pending += decoder.decode(); break; }
      onActivity();
      pending += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = pending.indexOf("\n")) >= 0) {
        line(pending.slice(0, nl));
        pending = pending.slice(nl + 1);
      }
    }
    if (!complete) line(pending);
    if (!complete) throw new Error("incomplete-chat-stream");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
