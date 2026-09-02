import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Users, BookOpen } from 'lucide-react';
import { classService } from '@/services/class.service';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDate, formatNumber } from '@/utils/formatters';
import type { Class } from '@/types';
import toast from 'react-hot-toast';

const emptyForm = { name: '', level: '', section: '', capacity: 40, schoolYear: '2024-2025' };
type FormData = typeof emptyForm;

const levels = [
  { value: 'CP1', label: 'CP1' },
  { value: 'CP2', label: 'CP2' },
  { value: 'CE1', label: 'CE1' },
  { value: 'CE2', label: 'CE2' },
  { value: 'CM1', label: 'CM1' },
  { value: 'CM2', label: 'CM2' },
  { value: '6ème', label: '6ème' },
  { value: '5ème', label: '5ème' },
  { value: '4ème', label: '4ème' },
  { value: '3ème', label: '3ème' },
  { value: '2nde', label: '2nde' },
  { value: '1ère', label: '1ère' },
  { value: 'Terminale', label: 'Terminale' },
];

const sections = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
];

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    try { setClasses(await classService.getClasses()); }
    catch { setClasses([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClasses(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormErrors({}); setModalOpen(true); };
  const openEdit = (c: Class) => {
    setEditing(c);
    setForm({ name: c.name, level: c.level, section: c.section || '', capacity: c.capacity, schoolYear: c.schoolYear });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = 'Requis';
    if (!form.level) errors.level = 'Requis';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await classService.updateClass(editing.id, form);
        toast.success('Classe modifiée');
      } else {
        await classService.createClass(form);
        toast.success('Classe créée');
      }
      setModalOpen(false);
      fetchClasses();
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await classService.deleteClass(deleteTarget.id); toast.success('Classe supprimée'); setDeleteTarget(null); fetchClasses(); }
    catch {}
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{formatNumber(classes.length)} classe(s) au total</p>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Nouvelle classe</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : classes.length === 0 ? (
        <Card><div className="flex flex-col items-center justify-center py-12 text-gray-400"><BookOpen className="mb-2 h-8 w-8" /><p className="text-sm">Aucune classe trouvée</p></div></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id} className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                  <p className="text-sm text-gray-500">{cls.level} {cls.section ? `- ${cls.section}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(cls)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteTarget(cls)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {cls.studentCount ?? 0} / {cls.capacity} élèves</div>
                <span>Année {cls.schoolYear}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((cls.studentCount ?? 0) / cls.capacity) * 100)}%` }} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la classe' : 'Nouvelle classe'} size="md">
        <div className="space-y-4">
          <Input label="Nom de la classe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={formErrors.name} placeholder="Ex: 6ème A" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Niveau" options={levels} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} error={formErrors.level} placeholder="Sélectionner" />
            <Select label="Section" options={sections} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="Optionnelle" />
          </div>
          <Input label="Capacité" type="number" value={String(form.capacity)} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} />
          <Input label="Année scolaire" value={form.schoolYear} onChange={(e) => setForm({ ...form, schoolYear: e.target.value })} placeholder="2024-2025" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Supprimer la classe" message={`Voulez-vous vraiment supprimer la classe ${deleteTarget?.name} ?`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} variant="danger" loading={deleting} />
    </div>
  );
}
