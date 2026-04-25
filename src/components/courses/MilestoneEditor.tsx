"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { coursesService } from "@/lib/services/courses";
import { courseGradingService } from "@/lib/services/courseGrading";
import type { CourseMilestone } from "@/lib/types";

interface Props {
  courseId: string;
  lessons: Array<{ id: string; title: string; milestoneId?: string | null; sortOrder?: number; contentType?: string }>;
  onLessonsChanged?: () => void;
}

interface EditFormState {
  title: string;
  description: string;
  orderIndex: number;
  passingScore: number;
  weight: number;
}

function emptyForm(orderIndex = 0): EditFormState {
  return { title: "", description: "", orderIndex, passingScore: 70, weight: 1 };
}

export default function MilestoneEditor({ courseId, lessons, onLessonsChanged }: Props) {
  const { addToast } = useToast();
  const [milestones, setMilestones] = useState<CourseMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<EditFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<EditFormState>>({});
  const [linkingLessonBusy, setLinkingLessonBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await courseGradingService.listMilestones(courseId);
      const arr = Array.isArray(data) ? data : ((data as any)?.items ?? []);
      arr.sort((a: CourseMilestone, b: CourseMilestone) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      setMilestones(arr);
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to load milestones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (courseId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function handleCreate() {
    if (!form.title.trim()) {
      addToast("warning", "Milestone title is required");
      return;
    }
    setSaving(true);
    try {
      await courseGradingService.createMilestone(courseId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        orderIndex: Number(form.orderIndex) || milestones.length,
        passingScore: Number(form.passingScore) || 70,
        weight: Number(form.weight) || 1,
      });
      addToast("success", "Milestone created");
      setShowCreate(false);
      setForm(emptyForm(milestones.length + 1));
      load();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to create milestone");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(m: CourseMilestone) {
    setEditingId(m.id);
    setEditDraft({
      title: m.title,
      passingScore: m.passingScore,
      weight: m.weight,
      orderIndex: m.orderIndex,
    });
  }

  async function saveEdit(milestoneId: string) {
    try {
      await courseGradingService.updateMilestone(milestoneId, {
        title: editDraft.title?.trim(),
        passingScore: editDraft.passingScore != null ? Number(editDraft.passingScore) : undefined,
        weight: editDraft.weight != null ? Number(editDraft.weight) : undefined,
        orderIndex: editDraft.orderIndex != null ? Number(editDraft.orderIndex) : undefined,
      });
      addToast("success", "Milestone updated");
      setEditingId(null);
      setEditDraft({});
      load();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to update");
    }
  }

  async function deleteMilestone(id: string) {
    if (!confirm("Delete this milestone? Lessons linked to it will be unlinked.")) return;
    try {
      await courseGradingService.deleteMilestone(id);
      addToast("success", "Milestone deleted");
      load();
      onLessonsChanged?.();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to delete");
    }
  }

  async function linkLesson(lessonId: string, milestoneId: string | null) {
    setLinkingLessonBusy(lessonId);
    try {
      await coursesService.updateLesson(courseId, lessonId, { milestoneId });
      addToast("success", milestoneId ? "Lesson linked to milestone" : "Lesson unlinked");
      load();
      onLessonsChanged?.();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to link lesson");
    } finally {
      setLinkingLessonBusy(null);
    }
  }

  const lessonsByMilestone = new Map<string, typeof lessons>();
  for (const l of lessons) {
    if (l.milestoneId) {
      const arr = lessonsByMilestone.get(l.milestoneId) || [];
      arr.push(l);
      lessonsByMilestone.set(l.milestoneId, arr);
    }
  }
  const unlinkedLessons = lessons.filter((l) => !l.milestoneId);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Grading Rubric</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Organise lessons into milestones. Each milestone has a passing score learners must meet.
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm(milestones.length + 1));
            setShowCreate(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F77B0F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#F77B0F]/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Milestone
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-zinc-400">Loading milestones…</div>
      ) : milestones.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No milestones yet.</p>
          <p className="text-xs text-zinc-400 mt-1">
            Group lessons into milestones so learners get clear gates to pass.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((m, idx) => {
            const linked = lessonsByMilestone.get(m.id) || [];
            const isEditing = editingId === m.id;
            return (
              <div key={m.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#192C67] text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          className="col-span-2 px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                          value={editDraft.title ?? ""}
                          onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                          placeholder="Title"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-zinc-500">Pass%</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="w-full px-2 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                            value={editDraft.passingScore ?? 0}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, passingScore: Number(e.target.value) }))
                            }
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-zinc-500">Weight</span>
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            className="w-full px-2 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                            value={editDraft.weight ?? 0}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, weight: Number(e.target.value) }))
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {m.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span>Pass {m.passingScore}%</span>
                            <span>Weight {m.weight}</span>
                          </div>
                        </div>
                        {m.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            {m.description}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(m.id)}
                          className="text-xs font-medium px-2 py-1 rounded-md bg-[#192C67] text-white hover:bg-[#192C67]/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditDraft({});
                          }}
                          className="text-xs font-medium px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(m)}
                          className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteMilestone(m.id)}
                          className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Linked lessons */}
                <div className="mt-3 pl-10 space-y-1.5">
                  {linked.length === 0 ? (
                    <p className="text-xs italic text-zinc-400">No lessons linked yet.</p>
                  ) : (
                    linked.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-800/50 text-xs"
                      >
                        <span className="truncate text-zinc-700 dark:text-zinc-300">
                          {l.title}
                        </span>
                        <button
                          disabled={linkingLessonBusy === l.id}
                          onClick={() => linkLesson(l.id, null)}
                          className="text-[11px] text-zinc-500 hover:text-red-500 disabled:opacity-50"
                        >
                          Unlink
                        </button>
                      </div>
                    ))
                  )}

                  {unlinkedLessons.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-zinc-400">Link lesson:</span>
                      <select
                        disabled={!!linkingLessonBusy}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v) linkLesson(v, m.id);
                          e.target.value = "";
                        }}
                        defaultValue=""
                        className="text-xs px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                      >
                        <option value="">Choose lesson…</option>
                        {unlinkedLessons.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Milestone"
        size="md"
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Module 1: Foundations"
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
              Description (optional)
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                Order
              </label>
              <input
                type="number"
                min={0}
                value={form.orderIndex}
                onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                Passing %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.passingScore}
                onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                Weight
              </label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={handleCreate}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#192C67] hover:bg-[#192C67]/90 rounded-md disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
