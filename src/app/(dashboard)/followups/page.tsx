"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarClock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Phone,
  MessageCircle,
  Clock,
  XCircle,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  toPersianDigits,
  formatJalaliDate,
  formatPersianRelativeTime,
} from "@/lib/persian";
import { FOLLOWUP_TYPE_LABELS } from "@/types";

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "OVERDUE" | "DONE">("PENDING");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [resultNote, setResultNote] = useState("");

  // Delete FollowUp State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);

  const loadFollowUps = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/followups");
      const data = await res.json();
      if (data.followUps) setFollowUps(data.followUps);
    } catch (err) {
      console.error("Failed to load follow-ups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/followups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, resultNote }),
      });
      setIsModalOpen(false);
      setResultNote("");
      loadFollowUps();
    } catch (err) {
      alert("خطا در ثبت وضعیت پیگیری");
    }
  };

  const handleDeleteFollowUp = async () => {
    if (!taskToDelete) return;
    try {
      const res = await fetch(`/api/followups?id=${taskToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setTaskToDelete(null);
        loadFollowUps();
      } else {
        alert(data.error || "خطا در حذف وظیفه");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const filteredTasks = followUps.filter((f) => {
    if (activeTab === "PENDING") return f.status === "PENDING";
    if (activeTab === "OVERDUE") return f.status === "OVERDUE";
    if (activeTab === "DONE") return f.status === "DONE";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-carpet-crimson" />
            <span>مدیریت پیگیری‌ها و وظایف فروش (SLA & Tasks)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            برنامه‌ریزی تماس‌ها، ارسال کاتالوگ، یادآوری اقساط و ثبت نتیجه تعامل با مشتریان
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "PENDING"
              ? "bg-carpet-crimson text-white shadow-md shadow-carpet-crimson/25"
              : "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          در انتظار انجام (
          {toPersianDigits(followUps.filter((f) => f.status === "PENDING").length)})
        </button>

        <button
          onClick={() => setActiveTab("OVERDUE")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "OVERDUE"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/25"
              : "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          عقب‌افتاده و نیازمند اقدام فوری (
          {toPersianDigits(followUps.filter((f) => f.status === "OVERDUE").length)})
        </button>

        <button
          onClick={() => setActiveTab("DONE")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "DONE"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
              : "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          انجام‌شده (
          {toPersianDigits(followUps.filter((f) => f.status === "DONE").length)})
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            در حال بارگذاری وظایف...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500/50" />
            <p className="font-bold text-slate-700 dark:text-slate-300">
              موردی در این دسته وجود ندارد.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const typeMeta = FOLLOWUP_TYPE_LABELS[task.type as keyof typeof FOLLOWUP_TYPE_LABELS];
            const targetName =
              task.lead ? `${task.lead.firstName} ${task.lead.lastName} (لید)` :
              task.customer ? `${task.customer.firstName} ${task.customer.lastName} (مشتری)` :
              "بدون مخاطب";

            return (
              <Card key={task.id} className="p-4 sm:p-5" hoverEffect>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        {task.title}
                      </span>
                      <Badge
                        variant={
                          task.priority === "URGENT" || task.priority === "HIGH"
                            ? "danger"
                            : "secondary"
                        }
                        size="sm"
                      >
                        {typeMeta?.label || task.type}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      مخاطب: <span className="font-semibold text-slate-800 dark:text-slate-200">{targetName}</span> • زمان مقرر:{" "}
                      <span className="font-semibold text-carpet-crimson dark:text-amber-400">
                        {formatJalaliDate(task.scheduledAt, true)}
                      </span>
                    </p>

                    {task.resultNote && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg mt-2">
                        گزارش نتیجه: {task.resultNote}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {task.status !== "DONE" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setIsModalOpen(true);
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 ml-1.5" />
                        <span>ثبت گزارش و تکمیل</span>
                      </Button>
                    )}

                    {task.lead?.phone && (
                      <a href={`tel:${task.lead.phone}`}>
                        <Button variant="outline" size="sm">
                          <Phone className="w-3.5 h-3.5 ml-1" />
                          <span>تماس</span>
                        </Button>
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setTaskToDelete(task);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="حذف پیگیری"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal: Complete FollowUp Task */}
      {selectedTask && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="ثبت نتیجه و اتمام وظیفه پیگیری"
          subtitle={selectedTask.title}
        >
          <div className="space-y-4">
            <Input
              label="گزارش گفتگو یا نتیجه اقدام"
              placeholder="مثال: با مشتری تماس گرفته شد، قیمت طرح شاه‌عباسی اعلام شد و قرار شد فردا برای خرید اقساطی چک ارسال کند..."
              value={resultNote}
              onChange={(e) => setResultNote(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                انصراف
              </Button>
              <Button
                variant="primary"
                onClick={() => handleUpdateStatus(selectedTask.id, "DONE")}
              >
                ثبت به عنوان انجام‌شده
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Delete FollowUp Confirmation */}
      {taskToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="تایید حذف پیگیری"
          subtitle={`آیا از حذف وظیفه "${taskToDelete.title}" اطمینان دارید؟`}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                هشدار: این پیگیری از تقویم و فهرست وظایف کارشناس حذف خواهد شد.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                انصراف
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteFollowUp}>
                حذف قطعی پیگیری
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
