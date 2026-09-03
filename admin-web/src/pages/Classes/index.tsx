import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Users, BookOpen, RotateCcw } from 'lucide-react';
import { classService } from '@/services/class.service';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatNumber } from '@/utils/formatters';
import type { Class } from '@/types';
import toast from 'react-hot-toast';

const emptyForm = { name: '', level: '', section: '', capacity: 40, schoolYear: '2024-2025' };
type FormData = typeof emptyForm;
const levels = ['CP1','CP2','CE1','CE2','CM1','CM2','6ème','5ème','4ème','3ème','2nde','1ère','Terminale'].map(value => ({ value, label: value }));
const sections = ['A','B','C','D'].map(value => ({ value, label: value }));

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

  const fetchClasses = async () => {
    setLoading(true);
    setLoadError(null);
    try { setClasses(await classService.getClasses()); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Impossible de charger les classes.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClasses(); }, []);
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
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Classes</h1>
          <p className="mt-1 text-sm text-muted">Gérez les classes, leurs capacités et leurs effectifs.</p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-sm text-muted"><span className="font-medium text-slate-700">{formatNumber(classes.length)}</span> classe(s)</p>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Nouvelle classe</Button>
        </div>
      </div>
      {loadError && <Card><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4"><div><p className="text-sm font-medium text-red-800">Impossible de charger les classes.</p><p className="mt-1 text-sm text-red-700">{loadError}</p></div><Button variant="ghost" onClick={fetchClasses}><RotateCcw className="h-4 w-4" /> Réessayer</Button></div></Card>}
      {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-36 animate-pulse rounded-lg border border-line bg-slate-100" />)}</div> : !loadError && classes.length === 0 ? <Card><div className="flex flex-col items-center justify-center py-12 text-slate-400"><BookOpen className="mb-2 h-8 w-8" /><p className="text-sm">Aucune classe trouvée</p></div></Card> : !loadError && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{classes.map(cls => <Card key={cls.id} className="relative"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-base font-semibold text-slate-900">{cls.name}</h3><p className="mt-0.5 text-sm text-muted">{cls.level} {cls.section ? `- ${cls.section}` : ''}</p></div><div className="flex shrink-0 gap-1"><button onClick={() => openEdit(cls)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary focus-visible:text-primary" aria-label={`Modifier ${cls.name}`}><Pencil className="h-4 w-4" /></button><button onClick={() => setDeleteTarget(cls)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:text-red-600" aria-label={`Supprimer ${cls.name}`}><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted"><div className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {cls.studentCount ?? 0} / {cls.capacity} élèves</div><span>Année {cls.schoolYear}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((cls.studentCount ?? 0) / Math.max(1, cls.capacity)) * 100)}%` }} /></div></Card>)}</div>}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la classe' : 'Nouvelle classe'} size="md"><div className="space-y-4"><Input label="Nom de la classe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} error={formErrors.name} placeholder="Ex: 6ème A" /><div className="grid grid-cols-2 gap-4"><Select label="Niveau" options={levels} value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} error={formErrors.level} placeholder="Sélectionner" /><Select label="Section" options={sections} value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="Optionnelle" /></div><Input label="Capacité" type="number" value={String(form.capacity)} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} /><Input label="Année scolaire" value={form.schoolYear} onChange={e => setForm({ ...form, schoolYear: e.target.value })} placeholder="2024-2025" /></div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button></div></Modal>
      <ConfirmDialog open={!!deleteTarget} title="Supprimer la classe" message={`Voulez-vous vraiment supprimer la classe ${deleteTarget?.name} ?`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} variant="danger" loading={deleting} />
    </div>
  );
}
