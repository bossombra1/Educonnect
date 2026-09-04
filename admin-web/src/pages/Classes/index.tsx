import { useEffect, useState } from 'react';
import { Eye, Pencil, Trash2, Plus, Users, BookOpen, RotateCcw, Search } from 'lucide-react';
import { classService } from '@/services/class.service';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatNumber } from '@/utils/formatters';
import type { Class, ClassStudent } from '@/types';
import toast from 'react-hot-toast';

const emptyForm = { name: '', level: '', section: '', capacity: 40, schoolYear: '2025-2026' };
type FormData = typeof emptyForm;
const levels = ['CP1','CP2','CE1','CE2','CM1','CM2','6ème','5ème','4ème','3ème','2nde','1ère','Terminale'].map(value => ({ value, label: value }));
const sections = ['A','B','C','D'].map(value => ({ value, label: value }));
const statuses = [{ value: '', label: 'Tous les statuts' }, { value: 'active', label: 'Actifs' }, { value: 'inactive', label: 'Inactifs' }];

function detailError(error: unknown): string {
  const status = (error as any)?.response?.status;
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
  if (status === 403) return 'Vous n’êtes pas autorisé à consulter cette classe.';
  if (status === 404) return 'Classe introuvable ou inaccessible dans votre établissement.';
  return error instanceof Error ? error.message : 'Impossible de charger les détails de la classe.';
}

function statusLabel(status?: string) {
  if (status === 'active') return 'Actif';
  if (status === 'inactive') return 'Inactif';
  return status || '—';
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Class | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatus, setStudentStatus] = useState('');

  const fetchClasses = async () => {
    setLoading(true); setLoadError(null);
    try { setClasses(await classService.getClasses()); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Impossible de charger les classes.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClasses(); }, []);

  const loadDetail = async (classId: string, page = 1, search = studentSearch, status = studentStatus) => {
    setDetailLoading(true); setDetailErrorMessage(null);
    try {
      const [classData, studentResult] = await Promise.all([
        classService.getClass(classId),
        classService.getClassStudents(classId, page, 20, search, status),
      ]);
      setDetail(classData);
      setStudents(studentResult.data);
      setStudentPage(studentResult.pagination?.page ?? page);
      setStudentTotal(studentResult.pagination?.total ?? studentResult.data.length);
      setStudentTotalPages(studentResult.pagination?.totalPages ?? 1);
    } catch (error) {
      setDetailErrorMessage(detailError(error));
      setStudents([]);
    } finally { setDetailLoading(false); }
  };

  const openDetail = async (cls: Class) => {
    setDetailOpen(true); setDetail(cls); setStudents([]); setStudentPage(1); setStudentTotal(0); setStudentTotalPages(1); setStudentSearch(''); setStudentStatus('');
    await loadDetail(cls.id, 1, '', '');
  };

  const applyStudentFilters = async () => {
    if (!detail) return;
    setStudentPage(1);
    await loadDetail(detail.id, 1, studentSearch, studentStatus);
  };

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setFormErrors({}); setModalOpen(true); };
  const openEdit = (c: Class) => { setEditing(c); setForm({ name: c.name, level: c.level, section: c.section || '', capacity: c.capacity, schoolYear: c.schoolYear }); setFormErrors({}); setModalOpen(true); };
  const validate = (): boolean => { const errors: typeof formErrors = {}; if (!form.name.trim()) errors.name = 'Requis'; if (!form.level) errors.level = 'Requis'; setFormErrors(errors); return Object.keys(errors).length === 0; };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) { await classService.updateClass(editing.id, form); toast.success('Classe modifiée'); }
      else { await classService.createClass(form); toast.success('Classe créée'); }
      setModalOpen(false); await fetchClasses();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible d’enregistrer la classe.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await classService.deleteClass(deleteTarget.id); toast.success('Classe supprimée'); setDeleteTarget(null); await fetchClasses(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible de supprimer la classe.'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-xl font-semibold tracking-tight text-slate-900">Classes</h1><p className="mt-1 text-sm text-muted">Gérez les classes, leurs capacités et leurs effectifs.</p></div>
        <div className="flex items-center justify-between gap-3 sm:justify-end"><p className="text-sm text-muted"><span className="font-medium text-slate-700">{formatNumber(classes.length)}</span> classe(s)</p><Button onClick={openCreate}><Plus className="h-4 w-4" /> Nouvelle classe</Button></div>
      </div>

      {loadError && <Card><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4"><div><p className="text-sm font-medium text-red-800">Impossible de charger les classes.</p><p className="mt-1 text-sm text-red-700">{loadError}</p></div><Button variant="ghost" onClick={fetchClasses}><RotateCcw className="h-4 w-4" /> Réessayer</Button></div></Card>}
      {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-36 animate-pulse rounded-lg border border-line bg-slate-100" />)}</div> : !loadError && classes.length === 0 ? <Card><div className="flex flex-col items-center justify-center py-12 text-slate-400"><BookOpen className="mb-2 h-8 w-8" /><p className="text-sm">Aucune classe trouvée</p></div></Card> : !loadError && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{classes.map(cls => <Card key={cls.id} className="relative"><div className="flex items-start justify-between gap-3"><button onClick={() => openDetail(cls)} className="min-w-0 text-left" aria-label={`Voir les détails de ${cls.name}`}><h3 className="truncate text-base font-semibold text-slate-900 hover:text-primary">{cls.name}</h3><p className="mt-0.5 text-sm text-muted">{cls.level} {cls.section ? `- ${cls.section}` : ''}</p></button><div className="flex shrink-0 gap-1"><button onClick={() => openDetail(cls)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary" aria-label={`Voir les détails de ${cls.name}`}><Eye className="h-4 w-4" /></button><button onClick={() => openEdit(cls)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary" aria-label={`Modifier ${cls.name}`}><Pencil className="h-4 w-4" /></button><button onClick={() => setDeleteTarget(cls)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" aria-label={`Supprimer ${cls.name}`}><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted"><div className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {cls.studentCount ?? 0} / {cls.capacity} élèves</div><span>Année {cls.schoolYear}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((cls.studentCount ?? 0) / Math.max(1, cls.capacity)) * 100)}%` }} /></div><button onClick={() => openDetail(cls)} className="mt-3 text-xs font-medium text-primary hover:underline">Voir les détails</button></Card>)}</div>}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la classe' : 'Nouvelle classe'} size="md"><div className="space-y-4"><Input label="Nom de la classe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} error={formErrors.name} placeholder="Ex: 6ème A" /><div className="grid grid-cols-2 gap-4"><Select label="Niveau" options={levels} value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} error={formErrors.level} placeholder="Sélectionner" /><Select label="Section" options={sections} value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="Optionnelle" /></div><Input label="Capacité" type="number" value={String(form.capacity)} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} /><Input label="Année scolaire" value={form.schoolYear} onChange={e => setForm({ ...form, schoolYear: e.target.value })} placeholder="2025-2026" /></div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button></div></Modal>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail ? `Détails — ${detail.name}` : 'Détails de la classe'} size="xl">
        {detailLoading && !detail ? <div className="space-y-3"><div className="h-24 animate-pulse rounded-lg bg-slate-100" /><div className="h-56 animate-pulse rounded-lg bg-slate-100" /></div> : detailErrorMessage ? <div className="rounded-lg border border-red-200 bg-red-50 p-5"><p className="font-medium text-red-800">Impossible de charger les détails</p><p className="mt-1 text-sm text-red-700">{detailErrorMessage}</p><div className="mt-4"><Button variant="ghost" onClick={() => detail && loadDetail(detail.id, studentPage)}><RotateCcw className="h-4 w-4" /> Réessayer</Button></div></div> : detail && <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[['Classe', detail.name], ['Niveau', detail.level || '—'], ['Section', detail.section || '—'], ['Année scolaire', detail.schoolYear || '—'], ['Établissement', detail.establishmentName || '—']].map(([label, value]) => <div key={label} className="rounded-lg border border-line bg-slate-50 p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p></div>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4"><div><p className="text-sm text-muted">Effectif réel</p><p className="text-2xl font-semibold text-slate-900">{formatNumber(studentTotal)} <span className="text-sm font-normal text-muted">élève(s)</span></p></div><div className="text-right text-sm text-muted">Capacité : <span className="font-medium text-slate-800">{detail.capacity}</span>{detail.activeStudentCount !== undefined && <><br />Actifs : <span className="font-medium text-slate-800">{detail.activeStudentCount}</span></>}</div></div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end"><div className="flex-1"><Input label="Rechercher un élève" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Nom, prénom ou matricule" /></div><div className="md:w-52"><Select label="Statut" options={statuses} value={studentStatus} onChange={e => setStudentStatus(e.target.value)} /></div><Button onClick={applyStudentFilters}><Search className="h-4 w-4" /> Rechercher</Button></div>

          <div className="overflow-x-auto rounded-lg border border-line"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Nom</th><th className="px-4 py-3">Prénom</th><th className="px-4 py-3">Matricule scolaire</th><th className="px-4 py-3">Matricule</th><th className="px-4 py-3">Téléphone</th><th className="px-4 py-3">Statut</th></tr></thead><tbody className="divide-y divide-line">{detailLoading ? [1,2,3,4].map(i => <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-slate-100" /></td></tr>) : students.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted"><Users className="mx-auto mb-2 h-7 w-7" /><p>Aucun élève trouvé pour cette classe.</p></td></tr> : students.map(student => <tr key={student.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-900">{student.lastName || '—'}</td><td className="px-4 py-3">{student.firstName || '—'}</td><td className="px-4 py-3">{student.schoolMatricule || '—'}</td><td className="px-4 py-3">{student.matricule || '—'}</td><td className="px-4 py-3">{student.phone || '—'}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${student.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{statusLabel(student.status)}</span></td></tr>)}</tbody></table></div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted"><span>{formatNumber(studentTotal)} élève(s) au total · page {studentPage} / {studentTotalPages}</span><div className="flex gap-2"><Button variant="secondary" disabled={studentPage <= 1 || detailLoading} onClick={() => loadDetail(detail.id, studentPage - 1)}>Précédent</Button><Button variant="secondary" disabled={studentPage >= studentTotalPages || detailLoading} onClick={() => loadDetail(detail.id, studentPage + 1)}>Suivant</Button></div></div>
        </div>}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Supprimer la classe" message={`Voulez-vous vraiment supprimer la classe ${deleteTarget?.name} ?`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} variant="danger" loading={deleting} />
    </div>
  );
}
