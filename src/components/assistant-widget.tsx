"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Stethoscope, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAdherenceAssistant, type ChatMessage } from "@/app/assistant-actions";
import { Markdown } from "@/components/markdown";

const HIDDEN_ON = ["/", "/login", "/signup"];

export function AssistantWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isPending]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isPending) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");

    startTransition(async () => {
      const result = await askAdherenceAssistant(question, history);
      const content = "answer" in result ? result.answer : result.error;
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    });
  }

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex h-110 w-90 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="size-4 text-primary" />
              <p className="text-sm font-medium">Adherence assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close assistant"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask about your adherence, e.g. &quot;How has my adherence been for
                Aspirin?&quot; or &quot;What days did I forget my medicine?&quot;
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto whitespace-pre-wrap bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.role === "user" ? message.content : <Markdown>{message.content}</Markdown>}
              </div>
            ))}
            {isPending && (
              <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Thinking...
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your adherence..."
              disabled={isPending}
            />
            <Button type="submit" size="icon" disabled={isPending || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}

      {!isOpen && (
        <span className="pointer-events-none absolute right-0 bottom-full mb-3 rounded-full border border-primary/50 bg-card/90 px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground shadow-lg backdrop-blur-sm motion-safe:animate-pulse">
          Ask your adherence assistant anything
        </span>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label={isOpen ? "Close adherence assistant" : "Open adherence assistant"}
      >
        <Stethoscope className="size-6" />
      </button>
    </div>
  );
}
