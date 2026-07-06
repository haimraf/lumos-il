"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Eye,
  EyeOff,
  Flag,
  MessageSquare,
  Reply,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useOwlMail } from "@/components/OwlMail";
import { logActivityEvent } from "@/lib/activityEvents";
import { getNewsArticlePath } from "@/lib/seo";
import {
  insertNewsCommentQuote,
  parseNewsCommentQuote,
  stripNewsCommentQuote,
} from "@/lib/newsCommentQuotes";
import { renderLinkedText } from "@/lib/renderLinkedText";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";

const HOUSE_ACCENT: Record<string, { border: string; bg: string }> = {
  Gryffindor: { border: "#dc2626", bg: "rgba(220,38,38,0.05)" },
  Slytherin: { border: "#059669", bg: "rgba(5,150,105,0.05)" },
  Hufflepuff: { border: "#d97706", bg: "rgba(217,119,6,0.06)" },
  Ravenclaw: { border: "#2563eb", bg: "rgba(37,99,235,0.05)" },
};

const MIN_COMMENT_LENGTH = 20;
const COOLDOWN_MS = 30_000;

type NewsArticleEngagementProps = {
  newsId: string;
};

export default function NewsArticleEngagement({ newsId }: NewsArticleEngagementProps) {
  const [supabase] = useState(() => createClient());
  const [roleColors, setRoleColors] = useState<Record<string, string>>({});

  useEffect(() => {
    getRoleColorFromDB(supabase).then(setRoleColors);
  }, [supabase]);

  return (
    <div className="mt-10 space-y-8 border-t-2 border-[#1e0e04]/10 pt-8">
      <PollSection newsId={newsId} supabase={supabase} />
      <CommentsSection newsId={newsId} roleColors={roleColors} supabase={supabase} />
    </div>
  );
}

function PollSection({ newsId, supabase }: { newsId: string; supabase: ReturnType<typeof createClient> }) {
  const [poll, setPoll] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sendOwl } = useOwlMail();

  const fetchPollData = useCallback(async () => {
    const { data: pollData } = await supabase
      .from("polls")
      .select("*, poll_options(*)")
      .eq("news_id", newsId)
      .maybeSingle();

    if (!pollData) {
      setPoll(null);
      return;
    }

    setPoll(pollData);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setHasVoted(false);
      return;
    }

    const { data: vote } = await supabase
      .from("poll_votes")
      .select("*")
      .eq("poll_id", pollData.id)
      .eq("user_id", user.id)
      .maybeSingle();

    setHasVoted(Boolean(vote));
  }, [newsId, supabase]);

  useEffect(() => {
    void fetchPollData();
  }, [fetchPollData]);

  const handleVote = async () => {
    if (!selectedOption || isSubmitting || !poll) return;

    setIsSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      sendOwl("מערכת הסקרים", "יש להתחבר כדי להצביע.", "error");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("poll_votes").insert([
      {
        poll_id: poll.id,
        user_id: user.id,
        option_id: selectedOption,
      },
    ]);

    if (error) {
      sendOwl("תקלה קסומה", "לא הצלחנו לשמור את ההצבעה.", "error");
      setIsSubmitting(false);
      return;
    }

    await supabase.rpc("increment_vote", { p_option_id: selectedOption });

    void logActivityEvent(supabase, {
      actorId: user.id,
      eventType: "news_poll_voted",
      icon: "🗳",
      title: "הצביע/ה בסקר הנביא",
      subtitle: poll.question || "סקר הנביא היומי",
      targetType: "poll",
      targetId: poll.id,
    });

    await fetchPollData();
    setHasVoted(true);
    setIsSubmitting(false);
  };

  if (!poll) return null;

  const totalVotes = poll.poll_options.reduce((acc: number, opt: any) => acc + (opt.votes_count || 0), 0);

  return (
    <section
      className="rounded-2xl border border-amber-900/15 bg-amber-900/5 p-6"
      role="region"
      aria-label="סקר הנביא"
    >
      <h2 className="mb-5 flex items-center gap-2 font-cinzel text-lg font-black text-[#5d2a00]">
        <BarChart3 size={20} className="text-amber-800" />
        סקר הנביא
        {totalVotes > 0 && (
          <span className="mr-auto text-xs font-bold text-[#5d2a00]/45">{totalVotes} הצבעות</span>
        )}
      </h2>

      {hasVoted ? (
        <div className="space-y-4" role="list" aria-label="תוצאות הסקר">
          {poll.poll_options.map((opt: any) => {
            const pct = totalVotes > 0 ? Math.round(((opt.votes_count || 0) / totalVotes) * 100) : 0;
            return (
              <div key={opt.id} role="listitem">
                <div className="mb-1.5 flex justify-between text-sm font-bold text-[#5d2a00]">
                  <span>{pct}%</span>
                  <span>{opt.option_text}</span>
                </div>
                <div
                  className="h-3 w-full overflow-hidden rounded-full bg-black/10"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-amber-700 transition-all duration-1000 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3" role="group" aria-label="אפשרויות הצבעה">
          {poll.poll_options.map((opt: any) => (
            <button
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className="w-full rounded-lg border-2 px-5 py-3.5 text-right text-base font-bold transition-all"
              style={
                selectedOption === opt.id
                  ? { background: "#92400e", borderColor: "#78350f", color: "white" }
                  : { background: "rgba(255,255,255,0.5)", borderColor: "rgba(146,64,14,0.15)", color: "#5d2a00" }
              }
              aria-pressed={selectedOption === opt.id}
            >
              {opt.option_text}
            </button>
          ))}
          <button
            onClick={handleVote}
            disabled={!selectedOption || isSubmitting}
            className="mt-2 w-full rounded-lg bg-[#1e0e04] py-3.5 text-sm font-cinzel font-black tracking-wide text-[#e8d5a3] transition-all hover:bg-[#3d1500] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="שליחת ההצבעה"
          >
            {isSubmitting ? "שולח..." : "הצבעה"}
          </button>
        </div>
      )}
    </section>
  );
}

function CommentsSection({
  newsId,
  roleColors,
  supabase,
}: {
  newsId: string;
  roleColors: Record<string, string>;
  supabase: ReturnType<typeof createClient>;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reportingComment, setReportingComment] = useState<any | null>(null);
  const [replyTarget, setReplyTarget] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { sendOwl } = useOwlMail();
  const activeQuote = parseNewsCommentQuote(newComment);
  const commentBodyLength = stripNewsCommentQuote(newComment).trim().length;
  const commentsById = useMemo(
    () => new Map(comments.map((comment: any) => [comment.id, comment])),
    [comments],
  );

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
      return;
    }

    cooldownInterval.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1000) {
          if (cooldownInterval.current) clearInterval(cooldownInterval.current);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    };
  }, [cooldownRemaining]);

  const fetchData = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
      const { data: blocks } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", session.user.id);

      if (blocks) setBlockedUserIds(blocks.map((block: any) => block.blocked_id));
    } else {
      setCurrentUserId(null);
      setBlockedUserIds([]);
    }

    const { data } = await supabase
      .from("comments")
      .select("*, profiles(id, full_name, house, role, avatar_url, is_ghost, user_groups(name, color))")
      .eq("news_id", newsId)
      .order("created_at", { ascending: true });

    if (data) setComments(data);
  }, [newsId, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleQuoteComment = (comment: any) => {
    setReplyTarget(comment);
    const nextValue = insertNewsCommentQuote(newComment, comment);
    setNewComment(nextValue);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextValue.length, nextValue.length);
    });
  };

  const handleClearQuote = () => {
    setNewComment((current) => stripNewsCommentQuote(current));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleClearReplyTarget = () => {
    setReplyTarget(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handlePost = async () => {
    const trimmed = newComment.trim();
    const strippedBody = stripNewsCommentQuote(trimmed).trim();
    const quoteMeta = parseNewsCommentQuote(trimmed);

    if (!trimmed) {
      sendOwl("תגובה ריקה", "לא ניתן לשלוח תגובה ריקה.", "error");
      return;
    }

    if (strippedBody.length < MIN_COMMENT_LENGTH) {
      sendOwl(
        "הלחש קצר מדי",
        `תגובה איכותית דורשת לפחות ${MIN_COMMENT_LENGTH} תווים. כרגע יש ${strippedBody.length}.`,
        "error",
      );
      return;
    }

    if (cooldownRemaining > 0) {
      sendOwl("חוקי הקסם", `המתן/י עוד ${Math.ceil(cooldownRemaining / 1000)} שניות לפני תגובה נוספת.`, "error");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      sendOwl("לא מחובר/ת", "יש להתחבר לטירה כדי להגיב.", "error");
      return;
    }

    const alreadyCommented = comments.some((comment) => comment.user_id === user.id && !comment.parent_comment_id);
    if (!replyTarget && alreadyCommented) {
      sendOwl("כבר הגבת", "לכתבה הזו נספרת רק תגובה אחת לכל קוסם.", "error");
      return;
    }

    setIsPosting(true);
    const { error } = await supabase.rpc("create_news_comment_secure", {
      p_news_id: newsId,
      p_content: trimmed,
      p_parent_comment_id: replyTarget?.id || null,
    });

    if (error) {
      sendOwl("לחש ההשתקה", "לא הצלחנו לשלוח את התגובה כרגע.", "error");
      setIsPosting(false);
      return;
    }

    setNewComment("");
    setReplyTarget(null);
    await fetchData();
    setCooldownRemaining(COOLDOWN_MS);

    if (replyTarget && replyTarget.user_id && replyTarget.user_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: replyTarget.user_id,
        actor_id: user.id,
        type: "reply",
        target_url: `${getNewsArticlePath(newsId)}#comment-${replyTarget.id}`,
        content: quoteMeta ? "השיב/ה וציטט/ה אותך בתגובות לנביא היומי" : "השיב/ה לתגובה שלך בנביא היומי",
        is_read: false,
      });
    } else if (quoteMeta && quoteMeta.userId !== user.id) {
      await supabase.from("notifications").insert({
        user_id: quoteMeta.userId,
        actor_id: user.id,
        type: "quote",
        target_url: `${getNewsArticlePath(newsId)}#news-comments-${newsId}`,
        content: "ציטט/ה אותך בתגובות לנביא היומי",
        is_read: false,
      });
    }

    void logActivityEvent(supabase, {
      actorId: user.id,
      eventType: "news_comment_created",
      icon: "💬",
      title: "הגיב/ה לכתבה בנביא",
      subtitle: `${strippedBody.slice(0, 40)}${strippedBody.length > 40 ? "..." : ""}`,
      targetType: "news",
      targetId: newsId,
    });

    sendOwl("התגובה נשלחה", "הינשוף המריא והתגובה כבר יושבת מתחת לכתבה.", "magic");
    setIsPosting(false);
  };

  const handleSendReport = async () => {
    if (!reportReason || !reportingComment) return;

    setIsReporting(true);
    const { error } = await supabase.from("reports").insert([
      {
        reporter_id: currentUserId,
        target_id: reportingComment.id,
        target_type: "comment",
        reason: reportReason,
        content_preview: reportingComment.content,
        status: "pending",
      },
    ]);

    if (!error) {
      sendOwl("דיווח נשלח", "משרד הקסמים קיבל את הדיווח לבחינה.", "success");
      setReportingComment(null);
      setReportReason("");
    }

    setIsReporting(false);
  };

  const handleToggleMute = async (targetId: string, isMuted: boolean) => {
    if (!currentUserId) return;

    if (isMuted) {
      await supabase.from("blocks").delete().eq("blocker_id", currentUserId).eq("blocked_id", targetId);
      setBlockedUserIds((prev) => prev.filter((id) => id !== targetId));
      return;
    }

    await supabase.from("blocks").insert({ blocker_id: currentUserId, blocked_id: targetId });
    setBlockedUserIds((prev) => [...prev, targetId]);
  };

  return (
    <section id={`news-comments-${newsId}`} aria-label="תגובות הקהילה">
      <h2 className="mb-5 flex items-center gap-2 font-cinzel text-xl font-black text-[#3d1500]">
        <MessageSquare size={20} className="text-amber-800" />
        תגובות הקהילה
        <span className="mr-auto font-assistant text-xs font-bold text-[#5d2a00]/40">{comments.length} תגובות</span>
      </h2>

      <div className="mb-8 space-y-3">
        {replyTarget && (
          <div className="rounded-2xl border border-sky-500/15 bg-sky-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-900/80">
                  משיב/ה ל{replyTarget.profiles?.full_name || "תגובה"}
                </p>
                <p className="text-sm leading-7 text-sky-950/70 whitespace-pre-wrap">
                  {stripNewsCommentQuote(replyTarget.content || "").trim().slice(0, 160)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearReplyTarget}
                className="shrink-0 rounded-full border border-sky-900/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-sky-900/75 transition hover:bg-sky-900/5"
              >
                בטל תשובה
              </button>
            </div>
          </div>
        )}
        {activeQuote && (
          <div className="rounded-2xl border border-amber-900/15 bg-amber-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#92400e]">
                  מצטט/ת את {activeQuote.author}
                </p>
                <p className="text-sm leading-7 text-[#5d2a00]/75 whitespace-pre-wrap">
                  {activeQuote.body}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearQuote}
                className="shrink-0 rounded-full border border-[#92400e]/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#92400e]/80 transition hover:bg-[#92400e]/5"
              >
                הסר ציטוט
              </button>
            </div>
          </div>
        )}
        <textarea
          ref={inputRef}
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.ctrlKey) void handlePost();
          }}
          placeholder="כתבו תגובה... (Ctrl+Enter לשליחה)"
          rows={3}
          className="w-full resize-none rounded-xl border-2 border-amber-900/15 bg-white/50 p-4 text-sm text-[#1e0e04] outline-none transition-colors placeholder:text-[#5d2a00]/35 focus:border-amber-800/40"
          aria-label="כתיבת תגובה חדשה"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="text-[10px] font-bold"
              style={{
                color:
                  commentBodyLength >= MIN_COMMENT_LENGTH
                    ? "rgba(5,150,105,0.7)"
                    : commentBodyLength > 0
                      ? "rgba(180,83,9,0.7)"
                      : "rgba(93,42,0,0.35)",
              }}
            >
              {commentBodyLength} / {MIN_COMMENT_LENGTH} תווים מינימום
              {currentUserId &&
                !replyTarget &&
                comments.some((comment) => comment.user_id === currentUserId && !comment.parent_comment_id) && (
                <span className="mr-2" style={{ color: "rgba(180,83,9,0.6)" }}>
                  כבר הגבת לכתבה הזו
                </span>
              )}
            </span>
            {cooldownRemaining > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "rgba(180,83,9,0.7)" }}>
                <Clock size={10} /> המתן/י {Math.ceil(cooldownRemaining / 1000)} שניות
              </span>
            )}
          </div>
          <button
            onClick={() => void handlePost()}
            disabled={isPosting || cooldownRemaining > 0 || commentBodyLength < MIN_COMMENT_LENGTH}
            className="shrink-0 rounded-lg bg-[#1e0e04] px-6 py-2.5 text-xs font-cinzel font-black tracking-wide text-[#e8d5a3] transition-all hover:bg-[#3d1500] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="שלח תגובה"
          >
            {isPosting ? "שולח..." : cooldownRemaining > 0 ? `⏳ ${Math.ceil(cooldownRemaining / 1000)}s` : "שליחת ינשוף"}
          </button>
        </div>
      </div>

      <div className="space-y-3" role="list" aria-label="רשימת תגובות">
        {comments.length === 0 && (
          <p className="py-6 text-center text-sm italic text-[#5d2a00]/35">היה/י הראשון/ה להגיב.</p>
        )}

        {comments.map((comment) => {
          if (comment.profiles?.is_ghost && comment.user_id !== currentUserId) return null;

          const isMuted = blockedUserIds.includes(comment.user_id);
          const house = comment.profiles?.house;
          const houseStyle = house ? HOUSE_ACCENT[house] : null;
          const parentComment = comment.parent_comment_id ? commentsById.get(comment.parent_comment_id) ?? null : null;
          const isReply = Boolean(parentComment);
          const quotedComment = parseNewsCommentQuote(comment.content || "");
          const visibleContent = quotedComment?.remainder || comment.content;
          const isQuotedParentReply =
            Boolean(parentComment) &&
            Boolean(quotedComment) &&
            quotedComment?.userId === parentComment?.user_id;

          if (isMuted) {
            return (
              <div
                key={comment.id}
                className="flex items-center justify-between rounded-lg border border-[#1e0e04]/08 bg-black/[0.03] px-4 py-3 opacity-60"
                role="listitem"
              >
                <span className="text-xs italic text-[#5d2a00]/50">תגובה מוסתרת</span>
                <button
                  onClick={() => void handleToggleMute(comment.user_id, true)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-[#5d2a00]/50 transition-colors hover:text-[#5d2a00]"
                  aria-label="הצג תגובה מוסתרת"
                >
                  <Eye size={12} /> הצג
                </button>
              </div>
            );
          }

          const groupMeta = comment.profiles?.user_groups;
          const group = Array.isArray(groupMeta) ? groupMeta[0] : groupMeta;
          const nameColor = group?.color || getRoleColor(comment.profiles?.role, comment.profiles?.house, roleColors);
          const badgeLabel = group?.name || comment.profiles?.role || null;
          const badgeColor = group?.color || nameColor;

          return (
            <div
              key={comment.id}
              id={`comment-${comment.id}`}
              className={`group relative rounded-xl border p-4 transition-all ${isReply ? "mr-6" : ""}`}
              style={{
                background: isReply ? "rgba(255,248,235,0.92)" : houseStyle?.bg || "rgba(255,255,255,0.3)",
                borderColor: "rgba(146,64,14,0.1)",
                borderRight: `4px solid ${houseStyle?.border || "rgba(146,64,14,0.4)"}`,
              }}
              role="listitem"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/wizard/${comment.user_id}`} className="shrink-0">
                    <div
                      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border text-base transition-transform group-hover:scale-105"
                      style={{
                        background: houseStyle?.bg || "rgba(146,64,14,0.08)",
                        borderColor: houseStyle?.border ? `${houseStyle.border}50` : "rgba(146,64,14,0.2)",
                      }}
                    >
                      {comment.profiles?.avatar_url ? (
                        <img src={comment.profiles.avatar_url} alt={comment.profiles.full_name || "אווטאר"} className="h-full w-full object-cover" />
                      ) : house === "Gryffindor" ? (
                        "🦁"
                      ) : house === "Slytherin" ? (
                        "🐍"
                      ) : house === "Ravenclaw" ? (
                        "🦅"
                      ) : house === "Hufflepuff" ? (
                        "🦡"
                      ) : (
                        "🧙"
                      )}
                    </div>
                  </Link>

                  <Link
                    href={`/wizard/${comment.user_id}`}
                    className="font-cinzel text-sm font-black transition-colors hover:underline"
                    style={{ color: nameColor }}
                  >
                    {comment.profiles?.full_name || "קוסם אנונימי"}
                  </Link>

                  {badgeLabel && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 900,
                        fontFamily: "'Cinzel', serif",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: badgeColor,
                        background: `${badgeColor}18`,
                        border: `1px solid ${badgeColor}40`,
                        padding: "1px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      {badgeLabel}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <time className="text-[10px] font-bold text-[#5d2a00]/35" dateTime={comment.created_at}>
                    {new Date(comment.created_at).toLocaleDateString("he-IL")}{" "}
                    {new Date(comment.created_at).toLocaleTimeString("he-IL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>

                  {currentUserId && currentUserId !== comment.user_id && (
                    <div className="mr-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => handleQuoteComment(comment)}
                        className="rounded p-1 text-[#5d2a00]/30 transition-colors hover:text-[#5d2a00]/70"
                        title="השב/צטט"
                        aria-label={`השב ל${comment.profiles?.full_name || "התגובה"} עם ציטוט`}
                      >
                        <Reply size={13} />
                      </button>
                      <button
                        onClick={() => void handleToggleMute(comment.user_id, false)}
                        className="rounded p-1 text-[#5d2a00]/30 transition-colors hover:text-[#5d2a00]/70"
                        title="השתקה"
                        aria-label={`השתק את ${comment.profiles?.full_name || "המשתמש"}`}
                      >
                        <EyeOff size={13} />
                      </button>
                      <button
                        onClick={() => setReportingComment(comment)}
                        className="rounded p-1 text-[#5d2a00]/30 transition-colors hover:text-red-700"
                        title="דיווח"
                        aria-label={`דווח על תגובה של ${comment.profiles?.full_name || "המשתמש"}`}
                      >
                        <Flag size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {parentComment && (
                  <div className="rounded-2xl border border-sky-900/10 bg-sky-50/70 px-4 py-3">
                    <p className="text-[0px] leading-none">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-900/70">
                        {"\u05d1\u05ea\u05d2\u05d5\u05d1\u05d4 \u05dc"}
                        {parentComment.profiles?.full_name || "\u05ea\u05d2\u05d5\u05d1\u05d4 \u05e7\u05d5\u05d3\u05de\u05ea"}
                      </span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap font-assistant text-sm leading-relaxed text-sky-950/65">
                      {renderLinkedText(stripNewsCommentQuote(parentComment.content || "").trim().slice(0, 140))}
                    </p>
                  </div>
                )}
                {quotedComment && !isQuotedParentReply && (
                  <div className="rounded-2xl border border-[#92400e]/10 bg-[#fff8eb] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#92400e]/70">
                      ציטוט מתוך תגובה של {quotedComment.author}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap font-assistant text-sm leading-relaxed text-[#5d2a00]/75">
                      {renderLinkedText(quotedComment.body)}
                    </p>
                  </div>
                )}
                <p className="whitespace-pre-wrap font-assistant text-sm leading-relaxed text-[#1e0e04]/80">
                  {renderLinkedText(visibleContent)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {reportingComment && (
        <div
          className="fixed inset-0 z-[100002] flex items-center justify-center bg-black/70 p-6 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="דיווח על תגובה"
        >
          <div className="w-full max-w-sm animate-in zoom-in space-y-6 rounded-2xl bg-[#fdfaf5] p-8 shadow-2xl duration-200">
            <h3 className="flex items-center gap-2 font-cinzel text-lg font-black text-red-900">
              <AlertTriangle size={22} /> דיווח על תגובה
            </h3>
            <div className="space-y-2.5" role="group" aria-label="סיבת הדיווח">
              {["תוכן פוגעני", "ספוילרים", "ספאם", "אחר"].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className="w-full rounded-xl border-2 px-4 py-3 text-right text-sm font-bold transition-all"
                  style={
                    reportReason === reason
                      ? { background: "#7f1d1d", color: "white", borderColor: "#7f1d1d" }
                      : { background: "white", borderColor: "#f1f5f9", color: "#1e0e04" }
                  }
                  aria-pressed={reportReason === reason}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => void handleSendReport()}
                disabled={!reportReason || isReporting}
                className="flex-1 rounded-xl bg-red-900 py-3 text-sm font-black text-white transition-colors hover:bg-red-800 disabled:opacity-50"
              >
                דווח
              </button>
              <button
                onClick={() => {
                  setReportingComment(null);
                  setReportReason("");
                }}
                className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
