import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, Plus, Users, UsersRound, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { groupService } from '@/services/group.service';
import { classService } from '@/services/class.service';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Group, GroupMember, GroupType, Class } from '@/types';
import toast from 'react-hot-toast';

const typeOptions: { value: GroupType; label: string }[] = [
  { value: 'class', label: 'Par classe' }, { value: 'level', label: 'Par niveau' }, { value: 'role', label: 'Par rôle' }, { value: 'custom', label: 'Personnalisé' }, { value: 'all_school', label: 'Toute l\'école' },
];
const typeBadge: Record<GroupType, 'info' | 'success' | 'warning' | 'default' | 'danger'> = { class: 'info', level: 'success', role: 'warning', custom: 'default', all_school: 'danger' };
const typeLabels: Record<GroupType, string> = { class: 'Classe', level: 'Niveau', role: 'Rôle', custom: 'Personnalisé', all_school: 'Toute l\'école' };
const roleLabels: Record<string, string> = { STUDENT: 'Élève', PARENT: 'Parent', TEACHER: 'Enseignant', STAFF: 'Personnel', ADMIN: 'Administrateur', SUPER_ADMIN: 'Super administrateur' };
const emptyForm = { name: '', type: 'class' as GroupType, description: '', classIds: [] as string[], level: '', role: '' };
type FormData = typeof emptyForm;
const filterString = (value: unknown): string => Array.isArray(value) ? String(value[0] ?? '') : value == null ? '' : String(value);

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]); const [classes, setClasses] = useState<Class[]>([]); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState<string | null>(null); const [modalOpen, setModalOpen] = useState(false); const [editing, setEditing] = useState<Group | null>(null); const [form, setForm] = useState<FormData>(emptyForm); const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({}); const [deleteTarget, setDeleteTarget] = useState<Group | null>(null); const [deleting, setDeleting] = useState(false); const [saving, setSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false); const [detail, setDetail] = useState<Group | null>(null); const [members, setMembers] = useState<GroupMember[]>([]); const [detailLoading, setDetailLoading] = useState(false); const [detailError, setDetailError] = useState<string | null>(null); const [membersPage, setMembersPage] = useState(1); const [membersTotalPages, setMembersTotalPages] = useState(1); const [membersTotal, setMembersTotal] = useState(0);

  const fetchData = async () => { setLoading(true); setLoadError(null); try { const [groupsData, classesData] = await Promise.all([groupService.getGroups(), classService.getClasses()]); setGroups(groupsData); setClasses(classesData); } catch (error) { setLoadError(error instanceof Error ? error.message : 'Impossible de charger les groupes et les classes.'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);
  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormErrors({}); setModalOpen(true); };
  const openEdit = (g: Group) => { setEditing(g); setForm({ name: g.name, type: g.type, description: g.description || '', classIds: Array.isArray(g.filters?.classIds) ? g.filters.classIds.map(String) : [], level: filterString(g.filters?.level), role: filterString(g.filters?.role) }); setFormErrors({}); setModalOpen(true); };
  const validate = (): boolean => { const errors: typeof formErrors = {}; if (!form.name.trim()) errors.name = 'Le nom est requis'; setFormErrors(errors); return Object.keys(errors).length === 0; };
  const getFilters = (): Record<string, any> => { const filters: Record<string, any> = {}; if (form.type === 'class') filters.classIds = form.classIds; if (form.type === 'level' && form.level) filters.level = form.level; if (form.type === 'role' && form.role) filters.role = form.role; return filters; };
  const getPreviewCount = (): string => { switch (form.type) { case 'class': return `${form.classIds.length} classe(s) sélectionnée(s)`; case 'level': return form.level ? `Niveau ${form.level}` : 'Aucun niveau sélectionné'; case 'role': return form.role ? `Rôle ${form.role}` : 'Aucun rôle sélectionné'; case 'all_school': return 'Tous les utilisateurs'; default: return 'Personnalisé'; } };
  const handleSave = async () => { if (!validate()) return; setSaving(true); try { const data = { name: form.name, type: form.type, description: form.description || undefined, filters: getFilters() }; if (editing) { await groupService.updateGroup(editing.id, data); toast.success('Groupe modifié'); } else { await groupService.createGroup(data); toast.success('Groupe créé'); } setModalOpen(false); await fetchData(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible d’enregistrer le groupe.'); } finally { setSaving(false); } };
  const handleDelete = async () => { if (!deleteTarget) return; setDeleting(true); try { await groupService.deleteGroup(deleteTarget.id); toast.success('Groupe supprimé'); setDeleteTarget(null); await fetchData(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible de supprimer le groupe.'); } finally { setDeleting(false); } };

  const loadMembers = async (groupId: string, page = 1) => { setDetailLoading(true); setDetailError(null); try { const [groupData, memberResult] = await Promise.all([groupService.getGroup(groupId), groupService.getGroupMembers(groupId, page, 50)]); setDetail(groupData); setMembers(memberResult.data); setMembersPage(memberResult.pagination?.page ?? page); setMembersTotal(memberResult.pagination?.total ?? memberResult.data.length); setMembersTotalPages(memberResult.pagination?.totalPages ?? 1); } catch (error) { setDetailError(error instanceof Error ? error.message : 'Impossible de charger les détails du groupe.'); setMembers([]); } finally { setDetailLoading(false); } };
  const openDetail = async (group: Group) => { setDetailOpen(true); setDetail(group); setMembersPage(1); setMembers([]); setMembersTotal(0); setMembersTotalPages(1); await loadMembers(group.id, 1); };
  const changeMembersPage = async (page: number) => { if (!detail || page < 1 || page > membersTotalPages || detailLoading) return; await loadMembers(detail.id, page); };

  const columns: Column<Group>[] = [
    { key: 'name', header: 'Nom', render: (g) => <button className="font-medium text-slate-900 hover:text-primary" onClick={() => openDetail(g)}>{g.name}</button> },
    { key: 'type', header: 'Type', render: (g) => <Badge variant={typeBadge[g.type]}>{typeLabels[g.type]}</Badge> },
    { key: 'memberCount', header: 'Membres', render: (g) => <div className="flex items-center gap-1.5"><Users className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-700">{g.memberCount}</span></div> },
    { key: 'description', header: 'Description', render: (g) => <span className="block max-w-[240px] truncate text-sm text-slate-500">{g.description || '—'}</span> },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (g) => <div className="flex items-center justify-end gap-1"><button aria-label={`Voir les détails de ${g.name}`} onClick={() => openDetail(g)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary"><Eye className="h-4 w-4" /></button><button aria-label={`Modifier ${g.name}`} onClick={() => openEdit(g)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary"><Pencil className="h-4 w-4" /></button><button aria-label={`Supprimer ${g.name}`} onClick={() => setDeleteTarget(g)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-xl font-semibold tracking-tight text-slate-900">Groupes</h1><p className="mt-1 text-sm text-muted">Organisez les destinataires par classe, niveau, rôle ou groupe personnalisé.</p></div><Button onClick={openCreate}><Plus className="h-4 w-4" /> Nouveau groupe</Button></div>
      {loadError && <Card><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-red-800">Impossible de charger les données</p><p className="mt-1 text-sm text-red-700">{loadError}</p></div><Button variant="secondary" onClick={fetchData}><RotateCcw className="h-4 w-4" /> Réessayer</Button></div></Card>}
      <Card className="!p-0 overflow-hidden"><Table columns={columns} data={groups} loading={loading} keyExtractor={(g) => g.id} emptyMessage={loadError ? 'Données indisponibles' : 'Aucun groupe trouvé'} /></Card>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail ? `Détails — ${detail.name}` : 'Détails du groupe'} size="xl">
        {detailLoading && <div className="space-y-4 py-6"><div className="h-5 w-48 animate-pulse rounded bg-slate-200" /><div className="h-20 animate-pulse rounded bg-slate-100" /><div className="h-40 animate-pulse rounded bg-slate-100" /></div>}
        {!detailLoading && detailError && <div className="rounded-lg border border-red-200 bg-red-50 p-4"><p className="font-medium text-red-800">Impossible de charger le groupe</p><p className="mt-1 text-sm text-red-700">{detailError}</p><div className="mt-3"><Button variant="secondary" onClick={() => detail && loadMembers(detail.id, membersPage)}><RotateCcw className="h-4 w-4" /> Réessayer</Button></div></div>}
        {!detailLoading && !detailError && detail && <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-line p-3"><p className="text-xs text-muted">Type</p><div className="mt-1"><Badge variant={typeBadge[detail.type]}>{typeLabels[detail.type]}</Badge></div></div>
            <div className="rounded-lg border border-line p-3"><p className="text-xs text-muted">Établissement</p><p className="mt-1 font-medium text-slate-900">{detail.establishmentName || '—'}</p></div>
            <div className="rounded-lg border border-line p-3"><p className="text-xs text-muted">Membres réels</p><p className="mt-1 text-lg font-semibold text-slate-900">{detail.memberCount}</p></div>
            <div className="rounded-lg border border-line p-3"><p className="text-xs text-muted">Description</p><p className="mt-1 text-sm text-slate-700">{detail.description || '—'}</p></div>
          </div>
          <div><h3 className="mb-2 text-sm font-semibold text-slate-900">Critères du groupe</h3><div className="rounded-lg border border-line bg-slate-50 p-3 text-sm text-slate-700">{detail.type === 'class' && <span>Classes : {Array.isArray(detail.filters?.classIds) && detail.filters?.classIds.length ? detail.filters.classIds.join(', ') : 'aucune classe configurée'}</span>}{detail.type === 'level' && <span>Niveau : {filterString(detail.filters?.level) || 'non défini'}</span>}{detail.type === 'role' && <span>Rôle : {filterString(detail.filters?.role || detail.filters?.role_name) || 'non défini'}</span>}{detail.type === 'all_school' && <span>Tous les utilisateurs autorisés de l'établissement.</span>}{detail.type === 'custom' && <span>Groupe personnalisé : membres enregistrés manuellement.</span>}</div></div>
          <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">Membres ({membersTotal})</h3><span className="text-xs text-muted">Page {membersPage} / {membersTotalPages}</span></div>
            <div className="overflow-x-auto rounded-lg border border-line"><table className="min-w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left font-medium text-slate-600">Nom</th><th className="px-3 py-2 text-left font-medium text-slate-600">Rôle</th><th className="px-3 py-2 text-left font-medium text-slate-600">Matricule</th><th className="px-3 py-2 text-left font-medium text-slate-600">Classe</th><th className="px-3 py-2 text-left font-medium text-slate-600">Téléphone</th><th className="px-3 py-2 text-left font-medium text-slate-600">Statut</th></tr></thead><tbody className="divide-y divide-line">{members.map((m) => <tr key={m.id} className="hover:bg-slate-50"><td className="px-3 py-2"><div className="font-medium text-slate-900">{m.lastName} {m.firstName}</div><div className="text-xs text-muted">{m.establishmentName || ''}</div></td><td className="px-3 py-2">{roleLabels[m.role || ''] || m.role || '—'}</td><td className="px-3 py-2">{m.schoolMatricule || m.matricule || '—'}</td><td className="px-3 py-2">{m.className ? `${m.className}${m.classLevel ? ` · ${m.classLevel}` : ''}${m.classSection ? ` · ${m.classSection}` : ''}` : '—'}</td><td className="px-3 py-2">{m.phone || '—'}</td><td className="px-3 py-2">{m.studentStatus ? <Badge variant={m.studentStatus === 'active' ? 'success' : 'default'}>{m.studentStatus}</Badge> : '—'}</td></tr>)}{members.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted">Aucun membre dans ce groupe.</td></tr>}</tbody></table></div>
            <div className="mt-3 flex items-center justify-end gap-2"><Button variant="secondary" disabled={membersPage <= 1 || detailLoading} onClick={() => changeMembersPage(membersPage - 1)}><ChevronLeft className="h-4 w-4" /> Précédent</Button><Button variant="secondary" disabled={membersPage >= membersTotalPages || detailLoading} onClick={() => changeMembersPage(membersPage + 1)}>Suivant <ChevronRight className="h-4 w-4" /></Button></div>
          </div>
        </div>}
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le groupe' : 'Nouveau groupe'} size="lg">
        <div className="space-y-4"><Input label="Nom du groupe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={formErrors.name} placeholder="Ex: Parents 6ème A" /><Select label="Type de groupe" options={typeOptions.map(t => ({ value: t.value, label: t.label }))} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as GroupType })} /><Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optionnelle" />
          {form.type === 'class' && <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Classes</label><div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-line p-2">{classes.map(c => <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"><input type="checkbox" checked={form.classIds.includes(c.id)} onChange={(e) => e.target.checked ? setForm({ ...form, classIds: [...form.classIds, c.id] }) : setForm({ ...form, classIds: form.classIds.filter(id => id !== c.id) })} className="rounded border-slate-300 text-primary focus:ring-primary" /><span className="text-sm text-slate-700">{c.name} ({c.studentCount ?? 0} élèves)</span></label>)}</div></div>}
          {form.type === 'level' && <Select label="Niveau" options={[{ value: 'CP1', label: 'CP1' }, { value: 'CP2', label: 'CP2' }, { value: 'CE1', label: 'CE1' }, { value: 'CE2', label: 'CE2' }, { value: 'CM1', label: 'CM1' }, { value: 'CM2', label: 'CM2' }, { value: '6ème', label: '6ème' }, { value: '5ème', label: '5ème' }, { value: '4ème', label: '4ème' }, { value: '3ème', label: '3ème' }, { value: '2nde', label: '2nde' }, { value: '1ère', label: '1ère' }, { value: 'Terminale', label: 'Terminale' }]} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Sélectionner" />}
          {form.type === 'role' && <Select label="Rôle" options={[{ value: 'STUDENT', label: 'Élèves' }, { value: 'PARENT', label: 'Parents' }, { value: 'TEACHER', label: 'Enseignants' }, { value: 'STAFF', label: 'Personnel' }]} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Sélectionner" />}
          {form.type === 'all_school' && <div className="rounded-md border border-primary-100 bg-primary-50 p-3 text-sm text-primary-800"><UsersRound className="mb-1 h-5 w-5" /> Ce groupe inclura tous les utilisateurs de l'établissement.</div>}
          <div className="rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-600"><strong className="text-slate-800">Aperçu :</strong> {getPreviewCount()}</div></div>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer le groupe'}</Button></div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} title="Supprimer le groupe" message={`Voulez-vous vraiment supprimer le groupe "${deleteTarget?.name}" ?`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} variant="danger" loading={deleting} />
    </div>
  );
}
