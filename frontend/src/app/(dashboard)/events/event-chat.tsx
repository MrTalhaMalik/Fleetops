"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useEventMessages, useSendEventMessage } from "@/lib/queries";
import { cn } from "@/lib/cn";

type Props = {
  eventId: string;
};

export function EventChat({ eventId }: Props) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useEventMessages(eventId);
  const send = useSendEventMessage(eventId);
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || send.isPending) return;
    try {
      await send.mutateAsync(text);
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface">
      <div
        ref={scrollerRef}
        className="flex max-h-72 min-h-40 flex-col gap-3 overflow-y-auto p-4"
      >
        {isLoading && messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">
            No messages yet. Say hello.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.authorUserId === user?.id;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex max-w-[85%] gap-2",
                  mine ? "ml-auto flex-row-reverse" : "mr-auto",
                )}
              >
                <Avatar
                  name={m.authorName}
                  color={m.authorRole === "admin" ? "bg-foreground" : "bg-brand"}
                  size="sm"
                />
                <div className={cn("flex flex-col", mine && "items-end")}>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground">
                      {mine ? "You" : m.authorName}
                    </span>
                    {m.authorRole === "admin" && (
                      <Badge tone="muted">admin</Badge>
                    )}
                    <span className="text-[10px] text-muted-soft">
                      {formatTime(m.createdAt)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
                      mine
                        ? "rounded-tr-sm bg-brand text-foreground"
                        : "rounded-tl-sm bg-border-soft text-foreground",
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border-soft bg-background p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message the event group…"
          rows={1}
          className="min-h-10 max-h-32 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || send.isPending}
          className="flex h-10 items-center justify-center rounded-xl bg-foreground px-3 text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          {send.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
