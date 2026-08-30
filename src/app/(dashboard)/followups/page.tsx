"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Clock,
  Trash2,
  Zap,
  Sparkles,
  ArrowLeft,
  Calendar,
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
import { getCustomerSegmentConfig } from "@/lib/customer-intelligence";

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [todaysActions, setTodaysActions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "OVERDUE" | "DONE">("PENDING");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [resultNote, setResultNote] = useState("");

  // Create FollowUp Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: "",
    type: "CALL",
    priority: "HIGH",
    scheduledAt: new Date().toISOString().slice(0, 16),
    customerId: "",
  });

  // Delete FollowUp State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);

  const loadFollowUps = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/followups");
      const data = await res.json();
      if (data.followUps) setFollowUps(data.followUps);
      if (data.todaysSuggestedActions) setTodaysActions(data.todaysSuggestedActions);
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

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createFormData),
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        setCreateFormData({
          title: "",
          type: "CALL",
          priority: "HIGH",
          scheduledAt: new Date().toISOString().slice(0, 16),
          customerId: "",
        });
        loadFollowUps();
      } else {
        alert("خطا در ثبت وظیفه پیگیری");
      }
    } catch (err) {
      alert("خطا در ارتباط با سرور");
    }
  };

  const handleConvertActionToFollowup = (action: any) => {
    setCreateFormData({
      title: action.action,
      type: "CALL",
      priority: action.priority === "URGENT" ? "URGENT" : "HIGH",
      scheduledAt: new Date().toISOString().slice(0, 16),
      customerId: action.customerId,
    });
    setIsCreateModalOpen(true);
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
            <CalendarClock className="w-6 h-6 text-sky-600" />
            <span>مدیریت هوشمند پیگیری‌ها و اقدامات روزانه (Smart Follow-ups)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            اقدامات پیشنهادی بلادرنگ (Next Best Action)، مدیریت SLA و تقویم وظایف ارتباط با مشتریان
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          className="shadow-md shadow-sky-600/25"
        >
          <Plus className="w-4 h-4 ml-1.5" />
          <span>ثبت وظیفه پیگیری جدید</span>
        </Button>
      </div>

      {/* Today's Next Best Actions Section */}
      {todaysActions.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-slate-800/80 dark:to-slate-900/90 border-sky-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                اقدامات پیشنهادی و وظایف اولویت‌دار امروز (Next Best Actions)
              </h3>
            </div>
            <span className="text-xs text-sky-700 dark:text-sky-300 font-bold">
              {toPersianDigits(todaysActions.length)} اقدام نیازمند توجه
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {todaysActions.map((act, i) => {
              const segCfg = getCustomerSegmentConfig(act.segment);
              return (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/customers/${act.customerId}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-sky-600"
                        >
                          {act.customerName}
                        </Link>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${segCfg.badgeClass}`}
                        >
                          {segCfg.label}
                        </span>
                      </div>
                      <Badge
                        variant={act.priority === "URGENT" ? "danger" : "warning"}
                        size="sm"
                      >
                        {act.priority === "URGENT" ? "فوری و آنی" : "اولویت بالا"}
                      </Badge>
                    </div>

                    <p className="font-semibold text-xs text-sky-800 dark:text-sky-300 mt-2 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>{act.action}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      علت: {act.reason}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                    <span className="text-[11px] text-slate-400">
                      زمان مقرر: {act.suggestedDate}
                    </span>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${act.phone}`}>
                        <Button variant="outline" size="sm">
                          <Phone className="w-3 h-3 ml-1" />
                          <span>تماس</span>
                        </Button>
                      </a>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleConvertActionToFollowup(act)}
                      >
                        <Plus className="w-3 h-3 ml-1" />
                        <span>ثبت در تقویم</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "PENDING"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
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
                      مخاطب:{" "}
                      {task.customer ? (
                        <Link
                          href={`/customers/${task.customer.id}`}
                          className="font-semibold text-sky-600 hover:underline"
                        >
                          {targetName}
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{targetName}</span>
                      )}{" "}
                      • زمان مقرر:{" "}
                      <span className="font-semibold text-sky-600 dark:text-sky-400">
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

                    {(task.lead?.phone || task.customer?.phone) && (
                      <a href={`tel:${task.lead?.phone || task.customer?.phone}`}>
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

      {/* Modal: Create FollowUp */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="ثبت وظیفه پیگیری جدید"
        subtitle="برنامه‌ریزی تماس، یادآوری یا جلسه با مخاطب"
      >
        <form onSubmit={handleCreateFollowUp} className="space-y-4">
          <Input
            label="عنوان وظیفه"
            required
            placeholder="مثال: تماس جهت هماهنگی واریز پیش‌پرداخت طرح تبریز"
            value={createFormData.title}
            onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="نوع اقدام"
              options={[
                { value: "CALL", label: "تماس تلفنی" },
                { value: "WHATSAPP", label: "پیام واتساپ / تلگرام" },
                { value: "VISIT", label: "بازدید حضوری" },
                { value: "INVOICE", label: "صدور پیش‌فاکتور" },
                { value: "CHEQUE_REMINDER", label: "یادآوری سررسید چک" },
              ]}
              value={createFormData.type}
              onChange={(e) => setCreateFormData({ ...createFormData, type: e.target.value })}
            />

            <Select
              label="اولویت"
              options={[
                { value: "URGENT", label: "فوری و حیاتی" },
                { value: "HIGH", label: "بالا" },
                { value: "MEDIUM", label: "متوسط" },
                { value: "LOW", label: "عادی" },
              ]}
              value={createFormData.priority}
              onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value })}
            />
          </div>

          <Input
            label="تاریخ و زمان سررسید"
            type="datetime-local"
            required
            value={createFormData.scheduledAt}
            onChange={(e) => setCreateFormData({ ...createFormData, scheduledAt: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ثبت وظیفه
            </Button>
          </div>
        </form>
      </Modal>

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
              placeholder="مثال: با مشتری تماس گرفته شد، قیمت طرح اعلام شد و هماهنگی برای ارسال انجام شد..."
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
