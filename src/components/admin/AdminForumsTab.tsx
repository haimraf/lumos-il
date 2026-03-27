"use client";

import { Hash, Lock, MessageSquare, Pencil, Pin, Plus, Save, Search, Trash2, X } from "lucide-react";

type ForumCategory = { id: string; name: string; display_order?: number | null };
type ForumFormState = {
  name: string;
  description: string;
  slug: string;
  icon: string;
  category_id: string;
  staff_only_create: boolean;
  house_restriction: string;
  min_year: string;
};

type Props = {
  forums: any[];
  forumCategories: ForumCategory[];
  selectedForum: any;
  threads: any[];
  threadSearch: string;
  onThreadSearchChange: (value: string) => void;
  onSelectForum: (forum: any) => void;
  onClearSelectedForum: () => void;
  forumForm: ForumFormState;
  onForumFormChange: (updater: (prev: ForumFormState) => ForumFormState) => void;
  isAddingForum: boolean;
  editingForumId: string | null;
  isSavingForum: boolean;
  onForumNameChange: (value: string) => void;
  onCloseForumEditor: () => void;
  onSaveForum: () => void;
  onCreateForumDraft: () => void;
  onEditForumDraft: (forum: any) => void;
  onDeleteForum: (forumId: string) => void;
  forumCategoryMap: Record<string, string>;
  houseOptions: readonly string[];
  onPinThread: (thread: any) => void;
  onLockThread: (thread: any) => void;
  onDeleteThread: (threadId: string) => void;
};

export default function AdminForumsTab({
  forums,
  forumCategories,
  selectedForum,
  threads,
  threadSearch,
  onThreadSearchChange,
  onSelectForum,
  onClearSelectedForum,
  forumForm,
  onForumFormChange,
  isAddingForum,
  editingForumId,
  isSavingForum,
  onForumNameChange,
  onCloseForumEditor,
  onSaveForum,
  onCreateForumDraft,
  onEditForumDraft,
  onDeleteForum,
  forumCategoryMap,
  houseOptions,
  onPinThread,
  onLockThread,
  onDeleteThread,
}: Props) {
  return (
    <>
      <section className="grid grid-cols-3 gap-3">
        <div className="admin-card rounded-2xl p-4 text-center space-y-1">
          <div className="font-cinzel font-black text-xl text-orange-400">{forums.length}</div>
          <div className="font-cinzel text-[9px] text-white/25 uppercase tracking-widest">פורומים</div>
        </div>
        <div className="admin-card rounded-2xl p-4 text-center space-y-1">
          <div className="font-cinzel font-black text-xl text-sky-300">{forumCategories.length}</div>
          <div className="font-cinzel text-[9px] text-white/25 uppercase tracking-widest">קטגוריות</div>
        </div>
        <div className="admin-card rounded-2xl p-4 text-center space-y-1">
          <div className="font-cinzel font-black text-xl text-rose-300">
            {forums.filter((forum) => forum.staff_only_create || forum.house_restriction || forum.min_year).length}
          </div>
          <div className="font-cinzel text-[9px] text-white/25 uppercase tracking-widest">מוגבלים</div>
        </div>
      </section>

      {(isAddingForum || editingForumId) && (
        <section className="admin-card rounded-2xl p-5 space-y-4 border border-orange-500/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-cinzel text-xs font-black text-orange-400 flex items-center gap-2 uppercase tracking-widest">
                <Plus size={13} /> {editingForumId ? "עריכת פורום" : "פורום חדש"}
              </h3>
              <p className="text-[11px] text-white/35 mt-1">הטופס מחובר ישירות לטבלת `forums` ולקטגוריות הקיימות במסד.</p>
            </div>
            <button
              onClick={onCloseForumEditor}
              className="px-3 py-2 rounded-xl bg-white/5 text-white/35 hover:bg-white/10 hover:text-white/70 transition-all text-xs font-cinzel"
            >
              ביטול
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">שם הפורום</label>
              <input
                value={forumForm.name}
                onChange={(event) => onForumNameChange(event.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/80 outline-none focus:border-orange-500/30 transition-all"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">סלאג / כתובת</label>
              <input
                value={forumForm.slug}
                onChange={(event) => onForumFormChange((prev) => ({ ...prev, slug: event.target.value }))}
                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/80 outline-none focus:border-orange-500/30 transition-all"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">אייקון</label>
              <input
                value={forumForm.icon}
                onChange={(event) => onForumFormChange((prev) => ({ ...prev, icon: event.target.value }))}
                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/80 outline-none focus:border-orange-500/30 transition-all"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">קטגוריה</label>
              <select
                value={forumForm.category_id}
                onChange={(event) => onForumFormChange((prev) => ({ ...prev, category_id: event.target.value }))}
                className="w-full rounded-xl p-3 text-sm outline-none"
                style={{ backgroundColor: "#0f172a", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)", colorScheme: "dark" }}
              >
                <option value="">ללא קטגוריה</option>
                {forumCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">תיאור</label>
              <textarea
                value={forumForm.description}
                onChange={(event) => onForumFormChange((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full h-24 resize-none bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/80 outline-none focus:border-orange-500/30 transition-all"
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">הגבלת בית</label>
              <select
                value={forumForm.house_restriction}
                onChange={(event) => onForumFormChange((prev) => ({ ...prev, house_restriction: event.target.value }))}
                className="w-full rounded-xl p-3 text-sm outline-none"
                style={{ backgroundColor: "#0f172a", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)", colorScheme: "dark" }}
              >
                <option value="">ללא הגבלה</option>
                {houseOptions.map((house) => (
                  <option key={house} value={house}>{house}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">שנת מינימום</label>
              <input
                type="number"
                min={1}
                max={7}
                value={forumForm.min_year}
                onChange={(event) => onForumFormChange((prev) => ({ ...prev, min_year: event.target.value }))}
                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/80 outline-none focus:border-orange-500/30 transition-all"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-white/60">
                <input
                  type="checkbox"
                  checked={forumForm.staff_only_create}
                  onChange={(event) => onForumFormChange((prev) => ({ ...prev, staff_only_create: event.target.checked }))}
                />
                יצירה רק לצוות
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onCloseForumEditor}
              className="px-4 py-2 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 transition-all text-xs font-cinzel"
            >
              ביטול
            </button>
            <button
              onClick={onSaveForum}
              disabled={isSavingForum}
              className="px-4 py-2 rounded-xl bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500 hover:text-white transition-all text-xs font-cinzel font-black disabled:opacity-40 flex items-center gap-2"
            >
              <Save size={11} /> {isSavingForum ? "שומר..." : editingForumId ? "שמור שינויים" : "צור פורום"}
            </button>
          </div>
        </section>
      )}

      <section className="admin-card rounded-2xl p-5 space-y-3">
        <div className="flex justify-end">
          <button
            onClick={onCreateForumDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/25 text-orange-300 rounded-xl font-cinzel text-[10px] hover:bg-orange-500 hover:text-white transition-all"
          >
            <Plus size={11} /> הוסף פורום
          </button>
        </div>
        <h3 className="font-cinzel text-xs font-black text-orange-400 flex items-center gap-2 uppercase tracking-widest">
          <MessageSquare size={13} /> קטגוריות פורומים ({forums.length})
        </h3>
        <div className="space-y-2">
          {forums.map((forum) => {
            const threadCount = Array.isArray(forum.thread_count) ? forum.thread_count[0]?.count ?? 0 : forum.thread_count ?? 0;
            const categoryName = forum.category_id ? forumCategoryMap[forum.category_id] : null;

            return (
              <div
                key={forum.id}
                className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedForum?.id === forum.id
                    ? "bg-orange-500/10 border-orange-500/30"
                    : "bg-white/[0.02] border-white/[0.05] hover:border-white/10"
                }`}
                onClick={() => onSelectForum(forum)}
              >
                <span className="text-xl shrink-0">{forum.icon || "💬"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-cinzel text-xs font-black text-white/80 truncate">{forum.name}</p>
                    {categoryName && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-sky-400/10 border border-sky-400/20 text-sky-200">
                        {categoryName}
                      </span>
                    )}
                    {forum.staff_only_create && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-400/10 border border-rose-400/20 text-rose-200">
                        צוות
                      </span>
                    )}
                    {forum.house_restriction && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-400/10 border border-emerald-400/20 text-emerald-200">
                        {forum.house_restriction}
                      </span>
                    )}
                    {forum.min_year && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-400/10 border border-amber-400/20 text-amber-200">
                        שנה {forum.min_year}+
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/25">/{forum.slug} · {threadCount} שרשורים</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(event) => { event.stopPropagation(); onEditForumDraft(forum); }}
                    className="p-1.5 bg-orange-500/10 text-orange-300 rounded-lg hover:bg-orange-500 hover:text-white transition-all"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={(event) => { event.stopPropagation(); onDeleteForum(forum.id); }}
                    className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedForum && (
        <section className="admin-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-cinzel text-xs font-black text-orange-400 flex items-center gap-2 uppercase tracking-widest">
              <Hash size={13} /> שרשורים — {selectedForum.name}
            </h3>
            <button onClick={onClearSelectedForum} className="text-white/20 hover:text-white/50 transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="relative">
            <input
              value={threadSearch}
              onChange={(event) => onThreadSearchChange(event.target.value)}
              placeholder="חיפוש שרשור..."
              dir="rtl"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 pr-10 text-sm outline-none focus:border-orange-500/30 transition-all"
            />
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {threads
              .filter((thread) => !threadSearch || thread.title?.toLowerCase().includes(threadSearch.toLowerCase()))
              .map((thread) => {
                const postCount = Array.isArray(thread.post_count) ? thread.post_count[0]?.count ?? 0 : thread.post_count ?? 0;
                return (
                  <div key={thread.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {thread.is_pinned && <span className="text-amber-400 text-[8px]">📌</span>}
                        {thread.is_locked && <span className="text-red-400 text-[8px]">🔒</span>}
                        <span className="font-bold text-xs text-white/75 truncate">{thread.title}</span>
                      </div>
                      <p className="text-[10px] text-white/25 mt-0.5">{thread.profiles?.full_name || "—"} · {postCount} תגובות</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onPinThread(thread)}
                        title={thread.is_pinned ? "בטל עיגון" : "עגן שרשור"}
                        className={`p-1.5 rounded-lg transition-all text-xs ${
                          thread.is_pinned ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/30 hover:text-amber-400"
                        }`}
                      >
                        <Pin size={11} />
                      </button>
                      <button
                        onClick={() => onLockThread(thread)}
                        title={thread.is_locked ? "פתח" : "נעל"}
                        className={`p-1.5 rounded-lg transition-all ${
                          thread.is_locked ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white/30 hover:text-red-400"
                        }`}
                      >
                        <Lock size={11} />
                      </button>
                      <button
                        onClick={() => onDeleteThread(thread.id)}
                        className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            {threads.length === 0 && <p className="text-center text-white/20 font-cinzel text-xs py-6">אין שרשורים בפורום זה</p>}
          </div>
        </section>
      )}
    </>
  );
}
