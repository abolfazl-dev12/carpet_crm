"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  Kanban,
  Plus,
  Phone,
  Sparkles,
  User,
  Tag,
  Clock,
  Edit,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatToman, toPersianDigits, formatJalaliDate } from "@/lib/persian";
import { STAGE_CONFIG, LeadStatus } from "@/types";

interface KanbanCardProps {
  deal: any;
  isOverlay?: boolean;
  onEdit?: (deal: any) => void;
  onDelete?: (deal: any) => void;
}

function KanbanCard({ deal, isOverlay, onEdit, onDelete }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const leadOrCust = deal.lead || deal.customer;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 cursor-grab active:cursor-grabbing select-none transition-all group ${
        isDragging ? "opacity-30" : "hover:border-sky-500/50 hover:shadow-md"
      } ${isOverlay ? "rotate-2 shadow-2xl border-sky-500 scale-105" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
          {leadOrCust ? `${leadOrCust.firstName} ${leadOrCust.lastName}` : deal.title}
        </h4>
        <div className="flex items-center gap-1">
          {deal.priority === "HIGH" || deal.priority === "URGENT" ? (
            <Badge variant="danger" size="sm">
              فوری
            </Badge>
          ) : null}

          {/* Quick Action Buttons (Edit & Delete) */}
          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(deal);
              }}
              className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800"
              title="ویرایش معامله"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(deal);
              }}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="حذف معامله"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
        {deal.title}
      </p>

      {/* Deal Value & Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <span className="text-xs font-black text-sky-600 dark:text-sky-400">
          {formatToman(deal.value)}
        </span>
        <span className="text-[10px] text-slate-400">
          {deal.assignedTo?.name || "بدون کارشناس"}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  deals,
  onEdit,
  onDelete,
}: {
  stage: { key: LeadStatus; label: string; color: string; badgeClass: string };
  deals: any[];
  onEdit?: (deal: any) => void;
  onDelete?: (deal: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.key,
  });

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`w-72 sm:w-80 flex-shrink-0 flex flex-col rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border transition-colors ${
        isOver
          ? "border-sky-500 bg-sky-50/30 dark:bg-sky-950/20"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-800/60 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
            {stage.label}
          </h3>
          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
            {toPersianDigits(deals.length)}
          </span>
        </div>
      </div>

      {/* Column Sub-Header Stats */}
      <div className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200/40 dark:border-slate-800/40">
        مجموع: {formatToman(totalValue)}
      </div>

      {/* Cards Container */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[500px] max-h-[calc(100vh-280px)]">
        {deals.map((deal) => (
          <KanbanCard
            key={deal.id}
            deal={deal}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [activeDeal, setActiveDeal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create Deal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    title: "",
    value: 0,
    stage: "NEW",
    priority: "MEDIUM",
    notes: "",
  });

  // Edit Deal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDealForm, setEditDealForm] = useState({
    id: "",
    title: "",
    value: 0,
    stage: "NEW",
    priority: "MEDIUM",
    notes: "",
  });

  // Delete Deal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const stagesList = Object.entries(STAGE_CONFIG).map(([k, v]) => ({
    key: k as LeadStatus,
    label: v.label,
    color: v.color,
    badgeClass: v.badgeClass,
  }));

  const loadPipeline = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      if (data.deals) setDeals(data.deals);
    } catch (err) {
      console.error("Error loading pipeline:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  const handleDragStart = (event: any) => {
    const { active } = event;
    const deal = deals.find((d) => d.id === active.id);
    setActiveDeal(deal || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const dealId = active.id as string;
    const newStage = over.id as LeadStatus;

    // Optimistically update state
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    );

    try {
      await fetch(`/api/pipeline/${dealId}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
    } catch (err) {
      console.error("Error updating stage:", err);
      loadPipeline();
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDealForm),
      });
      const data = await res.json();
      if (res.ok) {
        setIsCreateModalOpen(false);
        setNewDealForm({
          title: "",
          value: 0,
          stage: "NEW",
          priority: "MEDIUM",
          notes: "",
        });
        loadPipeline();
      } else {
        alert(data.error || "خطا در ایجاد معامله");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleEditDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/pipeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDealForm),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        loadPipeline();
      } else {
        alert(data.error || "خطا در ویرایش معامله");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleDeleteDeal = async () => {
    if (!dealToDelete) return;
    try {
      const res = await fetch(`/api/pipeline?id=${dealToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setDealToDelete(null);
        loadPipeline();
      } else {
        alert(data.error || "خطا در حذف معامله");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const openEdit = (deal: any) => {
    setEditDealForm({
      id: deal.id,
      title: deal.title,
      value: deal.value || 0,
      stage: deal.stage || "NEW",
      priority: deal.priority || "MEDIUM",
      notes: deal.notes || "",
    });
    setIsEditModalOpen(true);
  };

  const openDelete = (deal: any) => {
    setDealToDelete(deal);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Kanban className="w-6 h-6 text-sky-600" />
            <span>پایپ‌لاین فروش فرش یاشار (Kanban Board)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            مدیریت فرصت‌ها و لیدها، تغییر وضعیت با درگ و دراپ، ویرایش و حذف معاملات
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          className="shadow-md shadow-sky-600/25"
        >
          <Plus className="w-4 h-4 ml-1.5" />
          <span>ثبت معامله جدید</span>
        </Button>
      </div>

      {/* Kanban Board Container with Horizontal Scroll */}
      <div className="w-full overflow-x-auto pb-6">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-start gap-4 min-w-max">
            {stagesList.map((stage) => {
              const columnDeals = deals.filter((d) => d.stage === stage.key);
              return (
                <KanbanColumn
                  key={stage.key}
                  stage={stage}
                  deals={columnDeals}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeDeal ? <KanbanCard deal={activeDeal} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal: Create Deal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="ثبت معامله جدید در پایپ‌لاین"
        subtitle="مشخصات فرصت فروش فرش یاشار را وارد نمایید"
      >
        <form onSubmit={handleCreateDeal} className="space-y-4">
          <Input
            label="عنوان معامله"
            required
            placeholder="مثال: خرید ۳ تخته ۱۲ متری طرح افشان یاشار"
            value={newDealForm.title}
            onChange={(e) => setNewDealForm({ ...newDealForm, title: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="مبلغ تخمینی (تومان)"
              type="number"
              value={newDealForm.value.toString()}
              onChange={(e) => setNewDealForm({ ...newDealForm, value: Number(e.target.value) })}
            />
            <Select
              label="اولویت"
              value={newDealForm.priority}
              onChange={(e) => setNewDealForm({ ...newDealForm, priority: e.target.value })}
              options={[
                { value: "LOW", label: "پایین" },
                { value: "MEDIUM", label: "متوسط" },
                { value: "HIGH", label: "بالا" },
                { value: "URGENT", label: "فوری و ویژه" },
              ]}
            />
          </div>

          <Select
            label="مرحله اولیه پایپ‌لاین"
            value={newDealForm.stage}
            onChange={(e) => setNewDealForm({ ...newDealForm, stage: e.target.value })}
            options={stagesList.map((s) => ({ value: s.key, label: s.label }))}
          />

          <Input
            label="یادداشت و جزئیات"
            value={newDealForm.notes}
            onChange={(e) => setNewDealForm({ ...newDealForm, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ثبت معامله
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Deal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش معامله پایپ‌لاین"
        subtitle={editDealForm.title}
      >
        <form onSubmit={handleEditDeal} className="space-y-4">
          <Input
            label="عنوان معامله"
            required
            value={editDealForm.title}
            onChange={(e) => setEditDealForm({ ...editDealForm, title: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="مبلغ معامله (تومان)"
              type="number"
              value={editDealForm.value.toString()}
              onChange={(e) => setEditDealForm({ ...editDealForm, value: Number(e.target.value) })}
            />
            <Select
              label="اولویت"
              value={editDealForm.priority}
              onChange={(e) => setEditDealForm({ ...editDealForm, priority: e.target.value })}
              options={[
                { value: "LOW", label: "پایین" },
                { value: "MEDIUM", label: "متوسط" },
                { value: "HIGH", label: "بالا" },
                { value: "URGENT", label: "فوری و ویژه" },
              ]}
            />
          </div>

          <Select
            label="مرحله پایپ‌لاین"
            value={editDealForm.stage}
            onChange={(e) => setEditDealForm({ ...editDealForm, stage: e.target.value })}
            options={stagesList.map((s) => ({ value: s.key, label: s.label }))}
          />

          <Input
            label="یادداشت"
            value={editDealForm.notes}
            onChange={(e) => setEditDealForm({ ...editDealForm, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ذخیره تغییرات
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Deal Confirmation */}
      {dealToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="تایید حذف معامله"
          subtitle={`آیا از حذف معامله "${dealToDelete.title}" از پایپ‌لاین اطمینان دارید؟`}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                هشدار: با حذف این معامله، این کارت از بورد پایپ‌لاین برداشته خواهد شد.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                انصراف
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteDeal}>
                حذف قطعی از پایپ‌لاین
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
