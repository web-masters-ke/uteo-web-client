"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { courseGradingService } from "@/lib/services/courseGrading";
import type { AssessmentType, LessonAssessment } from "@/lib/types";

interface Props {
  lessonId: string;
}

interface Draft {
  id?: string;
  question: string;
  type: AssessmentType;
  options: string[];
  /** For MC: single string matching chosen option. For CHECKBOX: array of correct options. */
  correctAnswer: string | string[];
  points: number;
  orderIndex: number;
}

function emptyDraft(orderIndex: number): Draft {
  return {
    question: "",
    type: "MULTIPLE_CHOICE",
    options: ["", "", "", ""],
    correctAnswer: "",
    points: 10,
    orderIndex,
  };
}

export default function AssessmentBuilder({ lessonId }: Props) {
  const { addToast } = useToast();
  const [items, setItems] = useState<LessonAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft(0));
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await courseGradingService.listAssessments(lessonId);
      const arr = Array.isArray(data) ? data : ((data as any)?.items ?? []);
      arr.sort((a: LessonAssessment, b: LessonAssessment) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      setItems(arr);
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (lessonId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  function openNew() {
    setDraft(emptyDraft(items.length));
    setShowModal(true);
  }

  function openEdit(a: LessonAssessment) {
    setDraft({
      id: a.id,
      question: a.question,
      type: a.type,
      options: a.options && a.options.length > 0 ? [...a.options] : ["", "", "", ""],
      correctAnswer:
        a.type === "CHECKBOX"
          ? Array.isArray(a.correctAnswer)
            ? a.correctAnswer
            : a.correctAnswer
            ? [a.correctAnswer as string]
            : []
          : (a.correctAnswer as string) || "",
      points: a.points,
      orderIndex: a.orderIndex,
    });
    setShowModal(true);
  }

  function setType(t: AssessmentType) {
    setDraft((d) => ({
      ...d,
      type: t,
      // Reset correctAnswer shape on type switch
      correctAnswer: t === "CHECKBOX" ? [] : "",
      options: t === "MULTIPLE_CHOICE" || t === "CHECKBOX" ? (d.options.length > 0 ? d.options : ["", "", "", ""]) : [],
    }));
  }

  function updateOption(i: number, v: string) {
    setDraft((d) => {
      const options = [...d.options];
      options[i] = v;
      return { ...d, options };
    });
  }

  function addOption() {
    setDraft((d) => ({ ...d, options: [...d.options, ""] }));
  }

  function removeOption(i: number) {
    setDraft((d) => {
      const options = d.options.filter((_, idx) => idx !== i);
      // Also clean correctAnswer
      let correctAnswer = d.correctAnswer;
      const removed = d.options[i];
      if (d.type === "MULTIPLE_CHOICE" && correctAnswer === removed) correctAnswer = "";
      if (d.type === "CHECKBOX" && Array.isArray(correctAnswer)) {
        correctAnswer = correctAnswer.filter((x) => x !== removed);
      }
      return { ...d, options, correctAnswer };
    });
  }

  function toggleCorrectCheckbox(opt: string) {
    setDraft((d) => {
      const cur = Array.isArray(d.correctAnswer) ? d.correctAnswer : [];
      return {
        ...d,
        correctAnswer: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt],
      };
    });
  }

  async function save() {
    if (!draft.question.trim()) {
      addToast("warning", "Question is required");
      return;
    }
    if ((draft.type === "MULTIPLE_CHOICE" || draft.type === "CHECKBOX")) {
      const opts = draft.options.filter((o) => o.trim());
      if (opts.length < 2) {
        addToast("warning", "At least 2 options are required");
        return;
      }
      if (draft.type === "MULTIPLE_CHOICE" && !(draft.correctAnswer as string)?.trim()) {
        addToast("warning", "Pick the correct answer");
        return;
      }
      if (draft.type === "CHECKBOX" && (!Array.isArray(draft.correctAnswer) || draft.correctAnswer.length === 0)) {
        addToast("warning", "Select at least one correct answer");
        return;
      }
    }
    setSaving(true);
    try {
      const payload: any = {
        question: draft.question.trim(),
        type: draft.type,
        points: Number(draft.points) || 10,
        orderIndex: Number(draft.orderIndex) || 0,
      };
      if (draft.type === "MULTIPLE_CHOICE" || draft.type === "CHECKBOX") {
        payload.options = draft.options.filter((o) => o.trim());
        payload.correctAnswer = draft.correctAnswer;
      }
      if (draft.id) {
        await courseGradingService.updateAssessment(draft.id, payload);
        addToast("success", "Assessment updated");
      } else {
        await courseGradingService.createAssessment(lessonId, payload);
        addToast("success", "Assessment created");
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this assessment question?")) return;
    try {
      await courseGradingService.deleteAssessment(id);
      addToast("success", "Deleted");
      load();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to delete");
    }
  }

  return (
    <div className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Assessments ({items.length})
        </h4>
        <button
          onClick={openNew}
          className="text-xs font-semibold text-[#F77B0F] hover:underline"
        >
          + Add Question
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">No assessment questions yet.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((a, idx) => (
            <div
              key={a.id}
              className="flex items-start gap-2 px-3 py-2 rounded-md bg-zinc-50 dark:bg-zinc-800/50"
            >
              <span className="text-xs font-bold text-[#192C67] dark:text-[#5b8bc7] mt-0.5">
                Q{idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-800 dark:text-zinc-200 truncate">
                  {a.question}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium uppercase text-zinc-500">
                    {a.type.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-zinc-400">· {a.points} pts</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(a)}
                  className="p-1 rounded-md text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={draft.id ? "Edit Assessment" : "New Assessment"}
        size="lg"
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">Type</label>
            <select
              value={draft.type}
              onChange={(e) => setType(e.target.value as AssessmentType)}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
            >
              <option value="MULTIPLE_CHOICE">Multiple Choice (single correct)</option>
              <option value="CHECKBOX">Checkbox (multiple correct)</option>
              <option value="TEXT">Text / Essay (manual grading)</option>
              <option value="FILE_UPLOAD">File Upload (manual grading)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
              {draft.type === "FILE_UPLOAD" ? "Prompt / Instructions" : "Question"}
            </label>
            <textarea
              rows={3}
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
            />
          </div>

          {(draft.type === "MULTIPLE_CHOICE" || draft.type === "CHECKBOX") && (
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                Options {draft.type === "CHECKBOX" ? "(tick all correct)" : "(select the correct one)"}
              </label>
              <div className="space-y-1.5">
                {draft.options.map((opt, i) => {
                  const isCorrect =
                    draft.type === "MULTIPLE_CHOICE"
                      ? draft.correctAnswer === opt && opt !== ""
                      : Array.isArray(draft.correctAnswer) && draft.correctAnswer.includes(opt) && opt !== "";
                  return (
                    <div key={i} className="flex items-center gap-2">
                      {draft.type === "MULTIPLE_CHOICE" ? (
                        <input
                          type="radio"
                          name="correct-mc"
                          checked={isCorrect}
                          disabled={!opt.trim()}
                          onChange={() => setDraft({ ...draft, correctAnswer: opt })}
                          className="accent-[#192C67]"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isCorrect}
                          disabled={!opt.trim()}
                          onChange={() => toggleCorrectCheckbox(opt)}
                          className="accent-[#192C67]"
                        />
                      )}
                      <input
                        value={opt}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        onChange={(e) => updateOption(i, e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                      />
                      {draft.options.length > 2 && (
                        <button
                          onClick={() => removeOption(i)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={addOption}
                className="mt-2 text-xs font-medium text-[#192C67] dark:text-[#5b8bc7] hover:underline"
              >
                + Add option
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">Points</label>
              <input
                type="number"
                min={0}
                value={draft.points}
                onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">Order</label>
              <input
                type="number"
                min={0}
                value={draft.orderIndex}
                onChange={(e) => setDraft({ ...draft, orderIndex: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={save}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#192C67] hover:bg-[#192C67]/90 rounded-md disabled:opacity-50"
            >
              {saving ? "Saving…" : draft.id ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
