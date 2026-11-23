"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUp, History, MessageSquarePlus, Mic, Square, Trash2, UsersRound, X } from "lucide-react";
import { suggestedQuestions } from "@/brand/brand";
import { readChatStream } from "@/lib/chat-stream";
import { stopSpeaking, subscribeSpeechSupport } from "@/lib/speech";
import { recognitionConstructor, supportsDictation, type Recognition } from "@/lib/dictation";
import { LogoMark } from "@/components/Logo";
import { AssistantMessage, type ChatMessage } from "./AssistantMessage";
import { loadProfile, profileLabel, ProfileStep, saveProfile, type Profile } from "./ProfileStep";

type Conversation = { id: string; title: string; updatedAt: number; messages: ChatMessage[] };
type Status = {
  ollama: { available: boolean; model: string | null; reason?: string; provider?: "gemini" | "ollama" };
  stats: { approved: number };
};

const STORAGE_KEY = "raizia.conversaciones.v1";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function loadConversations(): Conversation[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as Conversation[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function relativeDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const diff = Math.floor((today.setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000);
  if (diff <= 0) return d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

const LEGACY_LIMIT = "Hay muchas consultas en este momento. Espera un momento y vuelve a preguntar.";

export function Chat() {
  const router = useRouter();
  const params = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const canDictate = useSyncExternalStore(subscribeSpeechSupport, supportsDictation, () => false);
  const recognitionRef = useRef<Recognition | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  // undefined = aún no se ha leído; null = la persona todavía no responde.
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stick = useRef(true);
  const messagesRef = useRef<ChatMessage[]>([]);
  const activeRef = useRef<string | null>(null);
  const started = useRef(false);
  const profileRef = useRef<Profile | null>(null);
  const pendingQuestion = useRef("");
  useEffect(() => {
    messagesRef.current = messages;
    activeRef.current = activeId;
  }, [messages, activeId]);

  const cancelDictation = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = recognition.onend = recognition.onerror = null;
      recognition.abort();
    }
    setListening(false);
    setVoiceStatus("");
  }, []);

  const dictate = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); return; }
    const Recognition = recognitionConstructor();
    if (!Recognition || busy) return;
    stopSpeaking();
    try {
      if (!window.localStorage.getItem("raizia.aviso-voz.v1")) {
        setVoiceNotice(true);
        window.localStorage.setItem("raizia.aviso-voz.v1", "1");
      }
    } catch { setVoiceNotice(true); }
    const recognition = new Recognition();
    recognition.lang = "es-CO";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = event => {
      const words: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) words.push(event.results[i][0].transcript);
      }
      if (words.length) {
        setInput(previous => [previous.trim(), words.join(" ").trim()].filter(Boolean).join(" "));
        setVoiceStatus("Revisa el texto. Toca enviar cuando esté listo.");
      }
    };
    recognition.onerror = () => setVoiceStatus("No pude escuchar. Puedes escribir tu pregunta.");
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      inputRef.current?.focus();
    };
    recognitionRef.current = recognition;
    setListening(true);
    setVoiceStatus("");
    try { recognition.start(); }
    catch {
      cancelDictation();
      setVoiceStatus("No pude escuchar. Puedes escribir tu pregunta.");
    }
  };

  useEffect(() => {
    const leave = () => {
      stopSpeaking();
      cancelDictation();
      abortRef.current?.abort();
    };
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); leave(); };
  }, [cancelDictation]);

  /* Historial de la sesión (se guarda solo en este navegador). */
  const persist = useCallback((id: string, msgs: ChatMessage[]) => {
    setConversations((prev) => {
      const title = (msgs.find((m) => m.role === "user")?.content || "Consulta").slice(0, 70);
      const clean = msgs.map((m) => ({ ...m, status: m.role === "assistant" ? ("listo" as const) : m.status }));
      const next = [
        { id, title, updatedAt: Date.now(), messages: clean },
        ...prev.filter((c) => c.id !== id),
      ].slice(0, 30);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* almacenamiento lleno o bloqueado: el historial queda solo en memoria */
      }
      return next;
    });
  }, []);

  const patchLast = (patch: (m: ChatMessage) => ChatMessage) =>
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? patch(m) : m)));

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || abortRef.current) return;
      stopSpeaking();
      cancelDictation();
      const convId = activeRef.current || uid();
      if (!activeRef.current) setActiveId(convId);

      // Un intento fallido no es parte del caso: no viaja a la IA ni se duplica al reenviarlo.
      const failed_ = (m?: ChatMessage) => m?.role === "assistant" && (!!m.error && !m.content || m.content === LEGACY_LIMIT);
      const clean = (list: ChatMessage[]) => list.filter((m, i) => !failed_(m) && !(m.role === "user" && failed_(list[i + 1]) && (m.content === text || i + 2 === list.length)));
      const history = clean(messagesRef.current)
        .filter((m) => m.content)
        .map((m) => ({ role: m.role, content: m.content }));
      const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
      const botMsg: ChatMessage = { id: uid(), role: "assistant", content: "", status: "buscando" };
      setMessages((prev) => [...prev.filter((m, i) => !(failed_(m) && prev[i - 1]?.content === text) && !(m.role === "user" && m.content === text && failed_(prev[i + 1]))), userMsg, botMsg]);
      setInput(text);
      setBusy(true);
      stick.current = true;

      const controller = new AbortController();
      abortRef.current = controller;
      let failed = "";
      let keepQuestion = false;
      let connectionLost = false;
      let slowTimer: ReturnType<typeof setTimeout>;
      let timeout: ReturnType<typeof setTimeout>;
      const activity = () => {
        clearTimeout(slowTimer);
        clearTimeout(timeout);
        setSlow(false);
        slowTimer = setTimeout(() => setSlow(true), 15_000);
        timeout = setTimeout(() => { connectionLost = true; controller.abort(); }, 60_000);
      };
      const offline = () => { connectionLost = true; controller.abort(); };
      window.addEventListener("offline", offline);
      activity();
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history, profile: profileRef.current }),
          signal: controller.signal,
        });
        if (res.status === 429) {
          const body = await res.json().catch(() => null);
          keepQuestion = true;
          if (abortRef.current === controller) patchLast(m => ({ ...m,
            error: typeof body?.message === "string" ? body.message : "Hay muchas consultas en este momento. Espera un momento y vuelve a preguntar.",
            meta: { type: "meta", mode: "conversacion", topics: [], sources: [] },
          }));
        } else {
          if (!res.ok || !res.body) throw new Error("respuesta no válida");
          await readChatStream(res.body, ev => {
            if (abortRef.current !== controller) return;
            if (ev.type === "meta") {
              patchLast((m) => ({ ...m, meta: ev, status: "redactando" }));
            } else if (ev.type === "token") {
              patchLast((m) => ({ ...m, content: m.content + ev.text }));
            } else if (ev.type === "error") {
              failed = ev.message;
              patchLast((m) => ({ ...m, error: ev.message }));
            }
          }, activity);
        }
      } catch {
        if (!controller.signal.aborted || connectionLost) {
          failed = "Se perdió la conexión o está muy lenta. Tu pregunta sigue aquí. Intenta de nuevo.";
        }
      } finally {
        clearTimeout(slowTimer!);
        clearTimeout(timeout!);
        window.removeEventListener("offline", offline);
        if (abortRef.current === controller) {
          const stopped = controller.signal.aborted;
          abortRef.current = null;
          setBusy(false);
          setSlow(false);
          if (!failed && !stopped && !keepQuestion) setInput(previous => previous === text ? "" : previous);
          setMessages((prev) => {
            const next = prev.map((m, i) =>
              i === prev.length - 1
                ? {
                    ...m,
                    status: stopped ? ("detenido" as const) : ("listo" as const),
                    error: failed || m.error,
                    meta:
                      m.meta ||
                      (stopped || failed
                        ? undefined
                        : { type: "meta" as const, mode: "sin_resultados" as const, topics: [], sources: [] }),
                  }
                : m,
            );
            persist(convId, next);
            return next;
          });
          inputRef.current?.focus();
        }
      }
    },
    [persist, cancelDictation],
  );

  /* Carga inicial: historial, estado de la IA y consulta enviada desde el inicio. */
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    setConversations(loadConversations());
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    const stored = loadProfile();
    profileRef.current = stored;
    setProfile(stored);
    const q = params.get("q");
    if (q) {
      router.replace("/asistente", { scroll: false });
      // Si falta el contexto de la comunidad, la consulta espera a que la persona responda.
      if (stored) void send(q);
      else pendingQuestion.current = q;
    } else if (stored) {
      inputRef.current?.focus();
    }
  }, [params, router, send]);

  /* Mantiene la vista al final mientras llega la respuesta, salvo que la persona suba a leer. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  const completeProfile = (p: Profile) => {
    saveProfile(p);
    profileRef.current = p;
    setProfile(p);
    const q = pendingQuestion.current;
    pendingQuestion.current = "";
    if (q) void send(q);
    else window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const changeProfile = () => {
    stopSpeaking();
    cancelDictation();
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    saveProfile(null);
    profileRef.current = null;
    setProfile(null);
    setMessages([]);
    setActiveId(null);
    setDrawer(false);
  };

  const newChat = () => {
    stopSpeaking();
    cancelDictation();
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMessages([]);
    setActiveId(null);
    setDrawer(false);
    inputRef.current?.focus();
  };

  const openConversation = (c: Conversation) => {
    stopSpeaking();
    cancelDictation();
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMessages(c.messages);
    setActiveId(c.id);
    setDrawer(false);
    stick.current = true;
  };

  const removeConversation = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* sin almacenamiento */
      }
      return next;
    });
    if (activeId === id) newChat();
  };

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.slice(0, prev.lastIndexOf(lastUser)));
    messagesRef.current = messagesRef.current.slice(0, messagesRef.current.lastIndexOf(lastUser));
    void send(lastUser.content);
  };

  const aiOn = status?.ollama.available;
  const statusPill = status && (
    <p
      className="flex items-center gap-2 text-xs text-muted"
      title={aiOn ? undefined : status.ollama.reason}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${aiOn ? "bg-forest-500" : "bg-ochre"}`} />
      {aiOn ? (
        <span>
          {status.ollama.provider === "gemini" ? "IA activa" : "IA local activa"} <span className="text-faint">· {status.ollama.model}</span>
        </span>
      ) : (
        <span>Modo búsqueda documental (IA no disponible)</span>
      )}
    </p>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <button type="button" onClick={newChat} className="btn btn-secondary w-full">
          <MessageSquarePlus size={17} />
          Nueva consulta
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <h2 className="eyebrow px-2.5 pt-2 pb-2 !text-faint">Historial de la sesión</h2>
        {conversations.length === 0 ? (
          <p className="px-2.5 text-sm leading-relaxed text-faint">
            Tus consultas aparecerán aquí. Se guardan solo en este navegador.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => openConversation(c)}
                  aria-current={c.id === activeId ? "true" : undefined}
                  className={`w-full rounded-xl py-2.5 pr-10 pl-3 text-left transition-colors ${
                    c.id === activeId ? "bg-forest-100" : "hover:bg-forest-50"
                  }`}
                >
                  <span className="block truncate text-sm font-medium text-ink">{c.title}</span>
                  <span className="block text-xs text-faint">{relativeDay(c.updatedAt)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeConversation(c.id)}
                  aria-label={`Eliminar la consulta: ${c.title}`}
                  className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-faint opacity-0 transition-opacity hover:bg-paper hover:text-clay-dark focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-3 border-t border-line p-4">
        {profile && (
          <div className="flex items-start gap-2.5">
            <UsersRound size={16} className="mt-0.5 shrink-0 text-forest-600" />
            <p className="min-w-0 flex-1 text-xs leading-snug text-muted">
              <span className="block text-faint">Consultas como</span>
              <span className="block font-semibold break-words text-ink">{profileLabel(profile)}</span>
            </p>
            <button
              type="button"
              onClick={changeProfile}
              className="shrink-0 text-xs font-semibold text-forest-700 underline-offset-4 hover:underline"
            >
              Cambiar
            </button>
          </div>
        )}
        {statusPill}
      </div>
    </div>
  );

  const empty = messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1">
      {/* Historial · escritorio */}
      <aside className="hidden w-72 shrink-0 border-r border-line bg-sand/40 lg:block" aria-label="Historial">
        {sidebar}
      </aside>

      {/* Historial · móvil */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Historial">
          <button
            type="button"
            aria-label="Cerrar historial"
            className="animate-fade absolute inset-0 bg-forest-950/40"
            onClick={() => setDrawer(false)}
          />
          <div className="animate-fade absolute inset-y-0 left-0 w-[86%] max-w-sm bg-ivory shadow-lift">
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Cerrar historial"
              className="btn btn-ghost btn-icon absolute top-3 -right-12 bg-ivory"
            >
              <X size={20} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col" aria-label="Conversación">
        <div className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-2 lg:hidden">
          <button type="button" onClick={() => setDrawer(true)} className="btn btn-ghost btn-sm !px-2.5">
            <History size={16} />
            Historial
          </button>
          {!empty && (
            <button type="button" onClick={newChat} className="btn btn-ghost btn-sm !px-2.5">
              <MessageSquarePlus size={16} />
              Nueva
            </button>
          )}
        </div>

        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
            {profile === undefined ? null : profile === null ? (
              <ProfileStep onDone={completeProfile} />
            ) : empty ? (
              <div className="animate-rise pt-4 sm:pt-12">
                <LogoMark size={44} />
                <h1 className="mt-6 text-3xl text-forest-900 sm:text-[2.5rem] sm:leading-tight">
                  ¿En qué te puedo orientar hoy?
                </h1>
                {profile.group && (
                  <p className="mt-3">
                    <span className="chip chip-earth !py-1">
                      <UsersRound size={13} />
                      {profileLabel(profile)}
                    </span>
                  </p>
                )}
                <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted">
                  Cuéntame qué está pasando. Busco en documentos oficiales y te explico, con palabras
                  sencillas, qué dicen y dónde lo dicen.
                </p>
                {status && status.stats.approved === 0 && (
                  <div className="notice mt-6">
                    <p>
                      La biblioteca todavía no tiene documentos aprobados, así que aún no puedo
                      responder consultas. Se agregan desde{" "}
                      <Link href="/admin" className="font-semibold underline underline-offset-4">
                        Administración
                      </Link>
                      .
                    </p>
                  </div>
                )}
                <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
                  {suggestedQuestions.slice(0, 4).map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => send(q)}
                        className="card card-hover h-full w-full px-4 py-3.5 text-left text-[0.9375rem] leading-snug text-ink/90"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-8" aria-live="polite">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={m.id} className="animate-rise flex justify-end">
                      <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-forest-700 px-5 py-3 leading-relaxed whitespace-pre-wrap text-paper">
                        <span className="sr-only">Tu consulta: </span>
                        {m.content}
                      </p>
                    </div>
                  ) : (
                    <AssistantMessage
                      onAnswer={i === messages.length - 1 && !busy ? (answer) => void send(answer) : undefined}
                      key={m.id}
                      message={m}
                      question={messages[i - 1]?.role === "user" ? messages[i - 1].content : ""}
                      conversation={messages.slice(0, i + 1).map(item => ({ role: item.role, content: item.content }))}
                      onRetry={i === messages.length - 1 && !busy ? retry : undefined}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Redacción */}
        <div className="bg-gradient-to-t from-ivory via-ivory to-transparent px-4 pt-2 pb-3 sm:px-6 sm:pb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[1.6rem] border border-line-strong bg-paper p-2 shadow-soft transition-shadow focus-within:border-forest-500 focus-within:shadow-lift"
          >
            <label htmlFor="mensaje" className="sr-only">
              Escribe tu consulta
            </label>
            <textarea
              id="mensaje"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              disabled={!profile || busy || listening}
              placeholder={profile === null ? "Responde primero la pregunta de arriba…" : "Escribe tu consulta…"}
              className="max-h-42 min-h-11 flex-1 resize-none bg-transparent px-3.5 py-2.5 leading-relaxed text-ink placeholder:text-faint focus:outline-none disabled:cursor-not-allowed"
            />
            {canDictate && !busy && (
              <button type="button" onClick={dictate} disabled={!profile}
                aria-label={listening ? "Detener micrófono" : "Dictar pregunta"} aria-pressed={listening}
                className="btn btn-secondary !min-h-11 !min-w-11 shrink-0 !px-3">
                {listening ? <Square size={18} /> : <Mic size={18} />}
                <span className="max-sm:sr-only">{listening ? "Detener" : "Dictar"}</span>
              </button>
            )}
            {busy ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                aria-label="Detener la respuesta"
                className="btn btn-secondary btn-icon !min-h-11 !w-11 shrink-0"
              >
                <Square size={15} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || !profile || listening}
                aria-label="Enviar consulta"
                className="btn btn-primary btn-icon !min-h-11 !w-11 shrink-0"
              >
                <ArrowUp size={19} />
              </button>
            )}
          </form>
          {voiceNotice && <p className="mx-auto mt-2 max-w-3xl text-sm text-muted">Tu navegador puede usar un servicio externo para convertir tu voz en texto.</p>}
          {(listening || voiceStatus) && <p role="status" className="mx-auto mt-2 max-w-3xl text-sm text-forest-700">{listening ? "Te escucho. Habla y luego revisa el texto." : voiceStatus}</p>}
          {busy && slow && <p role="status" className="mx-auto mt-2 max-w-3xl text-sm text-muted">La respuesta está tardando. Tu pregunta sigue aquí.</p>}
          <p className="mx-auto mt-2 max-w-3xl px-2 text-center text-xs leading-snug text-faint">
            Orientación general basada en documentos oficiales. No reemplaza la asesoría de un
            profesional del derecho.
          </p>
        </div>
      </section>
    </div>
  );
}
