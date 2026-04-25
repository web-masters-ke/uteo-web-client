'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';

/* ───────── Types ───────── */

interface DepartmentLead {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  email?: string;
}

interface DepartmentMember {
  id: string;
  userId: string;
  role: string;
  title?: string;
  specialization?: string;
  isActive: boolean;
  departmentId?: string;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
    avatar?: string;
    status?: string;
  };
}

interface Department {
  id: string;
  firmId: string;
  name: string;
  description?: string;
  leadId?: string;
  lead?: DepartmentLead | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number; slots?: number };
  members?: DepartmentMember[];
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  title?: string;
  specialization?: string;
  isActive: boolean;
  departmentId?: string;
  department?: { id: string; name: string } | null;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
    avatar?: string;
  };
}

/* ───────── Role badge config ───────── */

const ROLE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  OWNER:      { label: 'Owner',      bg: 'bg-[#192C67]/10 dark:bg-[#192C67]/30', text: 'text-[#192C67] dark:text-white/70' },
  ADMIN:      { label: 'Admin',      bg: 'bg-purple-50 dark:bg-purple-900/20',    text: 'text-purple-700 dark:text-purple-300' },
  CONSULTANT: { label: 'Consultant', bg: 'bg-[#F77B0F]/10 dark:bg-[#F77B0F]/30', text: 'text-[#B08930] dark:text-[#E8C96E]' },
  ASSOCIATE:  { label: 'Associate',  bg: 'bg-zinc-100 dark:bg-zinc-800',          text: 'text-zinc-600 dark:text-zinc-300' },
};

/* ───────── Component ───────── */

export default function DepartmentsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create/Edit modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formLeadId, setFormLeadId] = useState<string | null>(null);
  const [formActive, setFormActive] = useState(true);

  // Department detail view
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add member modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberTarget, setAddMemberTarget] = useState<Department | null>(null);

  // Delete confirm
  const [deleteDept, setDeleteDept] = useState<Department | null>(null);

  const isTrainer = user?.role === 'TRAINER';

  /* ───── Data fetch ───── */

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await apiGet<Department[] | { items: Department[] }>('/departments');
      const items = Array.isArray(data) ? data : (data as any)?.items ?? [];
      setDepartments(items);
    } catch {
      setDepartments([]);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const data = await apiGet<TeamMember[] | { items: TeamMember[] }>('/team/members');
      const items = Array.isArray(data) ? data : (data as any)?.items ?? [];
      setTeamMembers(items.filter((m: TeamMember) => m.isActive));
    } catch {
      setTeamMembers([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDepartments(), fetchTeamMembers()]).finally(() => setLoading(false));
  }, [fetchDepartments, fetchTeamMembers]);

  /* ───── Department detail ───── */

  const loadDepartmentDetail = async (dept: Department) => {
    setDetailLoading(true);
    try {
      const data = await apiGet<Department>(`/departments/${dept.id}`);
      setSelectedDept(data);
    } catch {
      addToast('error', 'Failed to load department details');
    } finally {
      setDetailLoading(false);
    }
  };

  /* ───── Create/Edit handlers ───── */

  const openCreate = () => {
    setEditDept(null);
    setFormName('');
    setFormDesc('');
    setFormLeadId(null);
    setFormActive(true);
    setShowFormModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditDept(dept);
    setFormName(dept.name);
    setFormDesc(dept.description ?? '');
    setFormLeadId(dept.leadId ?? null);
    setFormActive(dept.isActive);
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      addToast('error', 'Department name is required');
      return;
    }
    setSaving(true);
    try {
      if (editDept) {
        await apiPatch(`/departments/${editDept.id}`, {
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          leadId: formLeadId || undefined,
          isActive: formActive,
        });
        addToast('success', 'Department updated');
      } else {
        await apiPost('/departments', {
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          leadId: formLeadId || undefined,
        });
        addToast('success', 'Department created');
      }
      setShowFormModal(false);
      fetchDepartments();
      fetchTeamMembers();
    } catch {
      addToast('error', editDept ? 'Failed to update department' : 'Failed to create department');
    } finally {
      setSaving(false);
    }
  };

  /* ───── Delete department ───── */

  const handleDelete = async (dept: Department) => {
    setSaving(true);
    try {
      await apiDelete(`/departments/${dept.id}`);
      addToast('success', `"${dept.name}" deleted`);
      setDeleteDept(null);
      if (selectedDept?.id === dept.id) setSelectedDept(null);
      fetchDepartments();
      fetchTeamMembers();
    } catch {
      addToast('error', 'Failed to delete department');
    } finally {
      setSaving(false);
    }
  };

  /* ───── Add/Remove member ───── */

  const openAddMember = (dept: Department) => {
    setAddMemberTarget(dept);
    setShowAddMemberModal(true);
  };

  const handleAddMember = async (memberId: string) => {
    if (!addMemberTarget) return;
    setSaving(true);
    try {
      await apiPost(`/departments/${addMemberTarget.id}/members`, { memberId });
      addToast('success', 'Member added to department');
      fetchDepartments();
      fetchTeamMembers();
      if (selectedDept?.id === addMemberTarget.id) loadDepartmentDetail(addMemberTarget);
    } catch {
      addToast('error', 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (deptId: string, memberId: string) => {
    setSaving(true);
    try {
      await apiDelete(`/departments/${deptId}/members/${memberId}`);
      addToast('success', 'Member removed from department');
      fetchDepartments();
      fetchTeamMembers();
      if (selectedDept?.id === deptId) {
        const refreshed = await apiGet<Department>(`/departments/${deptId}`);
        setSelectedDept(refreshed);
      }
    } catch {
      addToast('error', 'Failed to remove member');
    } finally {
      setSaving(false);
    }
  };

  /* ───── Guard ───── */

  if (!isTrainer) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-300 dark:text-zinc-600">
          <path d="M12 15v2m0 0a2 2 0 100 4 2 2 0 000-4zm6-6V7a6 6 0 10-12 0v4m-2 0h16a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
        </svg>
        <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Access Restricted</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Department management is only available for Trainer accounts.
        </p>
      </div>
    );
  }

  if (loading) return <PageSkeleton />;

  /* ───── Available members (not yet in target department) ───── */

  const availableMembers = addMemberTarget
    ? teamMembers.filter(
        (m) => m.departmentId !== addMemberTarget.id && m.isActive,
      )
    : [];

  /* ───── Render ───── */

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Departments
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Organize your team into departments for better structure and availability management.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#192C67] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2D5A8E] dark:bg-[#2D5A8E] dark:hover:bg-[#192C67]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Create Department
        </button>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Departments', value: departments.length, color: 'text-[#192C67] dark:text-white/70' },
          { label: 'Active', value: departments.filter((d) => d.isActive).length, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Total Assigned', value: departments.reduce((s, d) => s + (d._count?.members ?? 0), 0), color: 'text-[#F77B0F] dark:text-[#E8C96E]' },
          { label: 'Unassigned', value: teamMembers.filter((m) => !m.departmentId).length, color: 'text-amber-600 dark:text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{s.label}</p>
            <p className={cn('mt-2 text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Department Cards + Detail Panel ─── */}
      {departments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          <EmptyState
            title="No departments yet"
            description="Create departments to organize your team members and manage department-level availability."
            action={{ label: 'Create First Department', onClick: openCreate }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Department list */}
          <div className="space-y-3 lg:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {departments.map((dept) => {
                const isSelected = selectedDept?.id === dept.id;
                const memberCount = dept._count?.members ?? 0;

                return (
                  <div
                    key={dept.id}
                    onClick={() => loadDepartmentDetail(dept)}
                    className={cn(
                      'group cursor-pointer rounded-xl border p-5 transition-all hover:shadow-md',
                      isSelected
                        ? 'border-[#192C67] bg-[#192C67]/5 ring-1 ring-[#192C67]/20 dark:border-[#F77B0F]/50 dark:bg-[#192C67]/10 dark:ring-[#5b8bc7]/20'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700',
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold',
                          dept.isActive
                            ? 'bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/30 dark:text-white/70'
                            : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600',
                        )}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 20h20M5 20V8l7-5 7 5v12M9 20v-4h6v4" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                            {dept.name}
                          </h3>
                          {!dept.isActive && (
                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(dept); }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-[#192C67] hover:bg-[#192C67]/10 dark:hover:text-[#5b8bc7] dark:hover:bg-[#192C67]/20 transition-colors"
                          title="Edit"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteDept(dept); }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {dept.description && (
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {dept.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Member count */}
                        <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          {memberCount} member{memberCount !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Lead */}
                      {dept.lead && (
                        <div className="flex items-center gap-1.5">
                          {dept.lead.avatar ? (
                            <img src={dept.lead.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#192C67] text-[8px] font-bold text-white">
                              {(dept.lead.firstName?.[0] ?? '').toUpperCase()}
                            </div>
                          )}
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            Lead: {dept.lead.firstName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Detail panel */}
          <div className="lg:col-span-1">
            {detailLoading ? (
              <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#192C67] border-t-transparent" />
              </div>
            ) : selectedDept ? (
              <div className="sticky top-20 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
                {/* Detail header */}
                <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {selectedDept.name}
                    </h3>
                    <button
                      onClick={() => setSelectedDept(null)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {selectedDept.description && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{selectedDept.description}</p>
                  )}
                  {selectedDept.lead && (
                    <div className="mt-2 flex items-center gap-2">
                      {selectedDept.lead.avatar ? (
                        <img src={selectedDept.lead.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#192C67] text-[9px] font-bold text-white">
                          {(selectedDept.lead.firstName?.[0] ?? '').toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-zinc-600 dark:text-zinc-300">
                        {selectedDept.lead.firstName} {selectedDept.lead.lastName}
                      </span>
                      <span className="rounded-full bg-[#192C67]/10 px-2 py-0.5 text-[9px] font-semibold text-[#192C67] dark:bg-[#192C67]/30 dark:text-white/70">
                        Lead
                      </span>
                    </div>
                  )}
                </div>

                {/* Members list */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Members ({selectedDept.members?.length ?? 0})
                    </span>
                    <button
                      onClick={() => openAddMember(selectedDept)}
                      className="flex items-center gap-1 text-xs font-medium text-[#192C67] hover:text-[#2D5A8E] dark:text-white/70 dark:hover:text-[#7da9d9] transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14m-7-7h14" />
                      </svg>
                      Add
                    </button>
                  </div>

                  {(!selectedDept.members || selectedDept.members.length === 0) ? (
                    <div className="py-8 text-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-zinc-300 dark:text-zinc-600">
                        <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">No members assigned</p>
                      <button
                        onClick={() => openAddMember(selectedDept)}
                        className="mt-2 text-xs font-medium text-[#192C67] hover:underline dark:text-white/70"
                      >
                        Add team members
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedDept.members.map((member) => {
                        const badge = ROLE_BADGE[member.role] ?? ROLE_BADGE.ASSOCIATE;
                        const initials = (
                          (member.user.firstName?.[0] ?? '') + (member.user.lastName?.[0] ?? '')
                        ).toUpperCase() || 'U';

                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group/member"
                          >
                            {member.user.avatar ? (
                              <img src={member.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#192C67] text-[10px] font-bold text-white">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                                  {member.user.firstName} {member.user.lastName}
                                </span>
                                <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold', badge.bg, badge.text)}>
                                  {badge.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                                {member.title || member.user.email}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveMember(selectedDept.id, member.id)}
                              className="p-1 rounded text-zinc-300 hover:text-red-500 opacity-0 group-hover/member:opacity-100 transition-all dark:text-zinc-600 dark:hover:text-red-400"
                              title="Remove from department"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-300 dark:text-zinc-600">
                  <path d="M2 20h20M5 20V8l7-5 7 5v12M9 20v-4h6v4" />
                </svg>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Select a department to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CREATE / EDIT DEPARTMENT MODAL                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editDept ? 'Edit Department' : 'Create Department'}
        size="md"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Department Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Financial Training"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#5b8bc7] dark:focus:ring-[#5b8bc7]/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Brief description of this department..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#5b8bc7] dark:focus:ring-[#5b8bc7]/20 resize-none"
            />
          </div>

          {/* Lead selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Department Lead
            </label>
            <select
              value={formLeadId ?? ''}
              onChange={(e) => setFormLeadId(e.target.value || null)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#5b8bc7] dark:focus:ring-[#5b8bc7]/20"
            >
              <option value="">No lead assigned</option>
              {teamMembers.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.firstName ?? ''} {m.user.lastName ?? ''} ({m.role})
                </option>
              ))}
            </select>
          </div>

          {/* Active toggle (only in edit mode) */}
          {editDept && (
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Active Status</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formActive ? 'Department is active and visible' : 'Department is inactive'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormActive(!formActive)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formActive ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="flex-1 rounded-lg bg-[#192C67] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2D5A8E] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#2D5A8E] dark:hover:bg-[#192C67]"
            >
              {saving ? 'Saving...' : editDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ADD MEMBER MODAL                                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title={`Add Member to ${addMemberTarget?.name ?? 'Department'}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Select a team member to add to this department. Members already in this department are excluded.
          </p>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {availableMembers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  All team members are already in this department.
                </p>
              </div>
            ) : (
              availableMembers.map((member) => {
                const badge = ROLE_BADGE[member.role] ?? ROLE_BADGE.ASSOCIATE;
                const initials = (
                  (member.user.firstName?.[0] ?? '') + (member.user.lastName?.[0] ?? '')
                ).toUpperCase() || 'U';

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
                  >
                    {member.user.avatar ? (
                      <img src={member.user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#192C67] text-xs font-bold text-white">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                          {member.user.firstName} {member.user.lastName}
                        </span>
                        <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold', badge.bg, badge.text)}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                        {member.department ? `Currently in: ${member.department.name}` : 'No department'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddMember(member.id)}
                      disabled={saving}
                      className="shrink-0 rounded-lg bg-[#192C67] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2D5A8E] disabled:opacity-50 dark:bg-[#2D5A8E] dark:hover:bg-[#192C67]"
                    >
                      {saving ? '...' : 'Add'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <button
            onClick={() => setShowAddMemberModal(false)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRM MODAL                                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!deleteDept}
        onClose={() => setDeleteDept(null)}
        title="Delete Department"
        size="sm"
      >
        {deleteDept && (
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete <strong>"{deleteDept.name}"</strong>?
              Members in this department will become unassigned. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteDept(null)}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteDept)}
                disabled={saving}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
