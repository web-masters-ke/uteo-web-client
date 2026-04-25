"use client";

import { useRef, useState } from "react";
import { coursesService } from "@/lib/services/courses";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";

interface Props {
  courseId: string;
  lesson: {
    id: string;
    title: string;
    contentType?: string;
    videoUrl?: string;
    textContent?: string;
  };
  onSaved?: () => void;
}

async function uploadToS3(file: File, folder: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`/media/upload?folder=${folder}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const d = (res.data as any)?.data ?? res.data;
  return d.url;
}

async function presignAndUpload(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const res = await api.post("/media/presign", {
    fileName: file.name,
    mimeType: file.type,
    folder,
  });
  const { uploadUrl, publicUrl } = (res.data as any)?.data ?? res.data;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    if (onProgress)
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded * 100) / e.total));
      });
    xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Upload failed ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(file);
  });
  return publicUrl;
}

export default function LessonEditor({ courseId, lesson, onSaved }: Props) {
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl ?? "");
  const [textContent, setTextContent] = useState(lesson.textContent ?? "");
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [docUploading, setDocUploading] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const ic =
    "w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#F77B0F]/40";

  async function handleVideoUpload(file: File) {
    setVideoUploading(true);
    setVideoProgress(0);
    try {
      const url = await presignAndUpload(file, "videos", (pct) => setVideoProgress(pct));
      setVideoUrl(url);
    } catch {
      addToast("error", "Video upload failed");
    } finally {
      setVideoUploading(false);
    }
  }

  async function handleDocUpload(file: File) {
    setDocUploading(true);
    try {
      const url = await uploadToS3(file, "documents");
      setVideoUrl(url);
      addToast("success", "Document uploaded");
    } catch {
      addToast("error", "Document upload failed");
    } finally {
      setDocUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const patch: any = {};
      if (lesson.contentType === "VIDEO" || lesson.contentType === "LIVE") patch.videoUrl = videoUrl;
      if (lesson.contentType === "TEXT") {
        patch.textContent = textContent;
        if (videoUrl !== lesson.videoUrl) patch.videoUrl = videoUrl;
      }
      await coursesService.updateLesson(courseId, lesson.id, patch);
      addToast("success", "Lesson updated");
      setEditing(false);
      onSaved?.();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-2 text-xs font-medium text-[#192C67] dark:text-[#5b8bc7] hover:underline"
      >
        ✎ Edit lesson content
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Edit Content — {lesson.contentType}
        </p>
        <button
          onClick={() => {
            setEditing(false);
            setVideoUrl(lesson.videoUrl ?? "");
            setTextContent(lesson.textContent ?? "");
          }}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          Cancel
        </button>
      </div>

      {/* VIDEO / LIVE */}
      {(lesson.contentType === "VIDEO" || lesson.contentType === "LIVE") && (
        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            {lesson.contentType === "LIVE" ? "Join URL" : "Video File / URL"}
          </label>
          <div className="flex gap-2">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className={ic}
              placeholder="Paste URL or upload →"
            />
            {lesson.contentType === "VIDEO" && (
              <>
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleVideoUpload(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => videoRef.current?.click()}
                  disabled={videoUploading}
                  className="px-3 py-2 rounded-lg bg-[#192C67] hover:bg-[#1a3480] text-white text-xs font-medium shrink-0 disabled:opacity-50 whitespace-nowrap"
                >
                  {videoUploading ? `${videoProgress}%` : "↑ Upload"}
                </button>
              </>
            )}
          </div>
          {videoUploading && (
            <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#F77B0F] transition-all"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* TEXT */}
      {lesson.contentType === "TEXT" && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-zinc-500">Lesson Text Content</label>
              <div className="flex items-center gap-2">
                <input
                  ref={docRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleDocUpload(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => docRef.current?.click()}
                  disabled={docUploading}
                  className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-[#192C67] hover:border-[#192C67] disabled:opacity-50"
                >
                  {docUploading ? "Uploading…" : "↑ Upload Doc"}
                </button>
              </div>
            </div>
            <textarea
              rows={8}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className={ic + " resize-none font-mono text-xs"}
              placeholder="Lesson text content — markdown supported…"
            />
          </div>
          {videoUrl && (
            <p className="text-xs text-zinc-400">
              Attached doc:{" "}
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#192C67] dark:text-[#5b8bc7] underline"
              >
                {videoUrl.split("/").pop()}
              </a>
            </p>
          )}
        </>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-[#F77B0F] hover:bg-[#e06a00] text-white text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
