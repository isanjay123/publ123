import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, BookOpen, Check, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { PublicaMark } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { askPublicaAi } from "@/lib/catalog.functions";
import {
  AI_AUTHORITY_NOTICE,
  AI_SUGGESTED_QUESTIONS,
  type AssistantReply,
} from "@/lib/services/ai";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  reply?: AssistantReply;
  failed?: boolean;
};

const INTENT_LABELS: Record<string, string> = {
  apply_for_service: "Intent: apply for a service",
  required_documents: "Intent: required documents",
  application_status: "Intent: application status",
  grievance: "Intent: grievance",
  processing_time: "Intent: processing time",
  fees: "Intent: published fees",
  unknown: "Intent: general guidance",
};

function time(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function PublicaAiChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const ask = useMutation({
    mutationFn: (question: string) => askPublicaAi({ data: { question } }),
    onSuccess: (reply, question) => {
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: reply.answer,
          at: new Date().toISOString(),
          reply,
        },
      ]);
      void question;
      textareaRef.current?.focus();
    },
    onError: () => {
      setMessages((current) => [
        ...current,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          at: new Date().toISOString(),
          text:
            "Publica AI is temporarily unavailable. You can continue using all standard government services.",
          failed: true,
        },
      ]);
    },
  });

  function send(question: string) {
    const trimmed = question.trim();
    if (trimmed.length < 3) {
      toast.error("Please describe your question in a few more words.");
      return;
    }
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", text: trimmed, at: new Date().toISOString() },
    ]);
    setInput("");
    ask.mutate(trimmed);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Answer copied");
    } catch {
      toast.error("Copying isn't available in this browser.");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className={compact ? "min-h-0 flex-1" : "min-h-[420px] flex-1"}>
        <ConversationContent className="gap-5">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/40 p-5">
              <div className="flex items-center gap-3">
                <PublicaMark className="h-8 w-8" />
                <div>
                  <p className="font-display font-semibold">Publica AI</p>
                  <p className="text-sm text-muted-foreground">Your digital public-service guide</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Ask about a service, the documents you need, or what a status on your application means.
                Answers are drawn only from the published service records.
              </p>
            </div>
          ) : null}

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.role === "assistant" ? (
                  <div className="space-y-3">
                    <MessageResponse>{message.text}</MessageResponse>

                    {message.failed ? (
                      <p className="flex items-center gap-2 text-xs text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Guidance unavailable — applications, uploads and tracking are unaffected.
                      </p>
                    ) : null}

                    {message.reply?.suggestions.length ? (
                      <div className="flex flex-wrap gap-2">
                        {message.reply.suggestions.map((suggestion) => (
                          <Link
                            key={suggestion.serviceSlug}
                            to="/services"
                            className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-primary"
                          >
                            {suggestion.serviceName} · {suggestion.department}
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {message.reply?.sources.length ? (
                      <div className="rounded-lg border border-border bg-card/70 p-3">
                        <p className="flex items-center gap-2 text-xs font-medium">
                          <BookOpen className="h-3.5 w-3.5" /> Sources
                        </p>
                        <ul className="mt-2 space-y-1">
                          {message.reply.sources.map((source) => (
                            <li key={source.label} className="text-xs text-muted-foreground">
                              <span className="text-foreground">{source.label}</span> — {source.detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{time(message.at)}</span>
                      {message.reply ? (
                        <Badge variant="secondary" className="font-normal">
                          {INTENT_LABELS[message.reply.intent] ?? "Intent: general guidance"}
                        </Badge>
                      ) : null}
                      {message.reply && !message.reply.verified ? (
                        <span className="text-warning">Not verifiable from published sources</span>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => copy(message.text)}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                    <p className="mt-1 text-[11px] opacity-80">{time(message.at)}</p>
                  </div>
                )}
              </MessageContent>
            </Message>
          ))}

          {ask.isPending ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Checking the published government sources…</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {AI_SUGGESTED_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => send(question)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              {question}
            </button>
          ))}
        </div>

        <PromptInput
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about a government service…"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={ask.isPending ? "submitted" : undefined} />
          </PromptInputFooter>
        </PromptInput>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {AI_AUTHORITY_NOTICE}
        </p>
      </div>
    </div>
  );
}

export function AiVerifiedTick() {
  return <Check className="h-3.5 w-3.5 text-success" />;
}
