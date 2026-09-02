import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, Upload, Mail, Lock, User as UserIcon, Phone } from 'lucide-react';
import { userService } from '@/services/user.service';
import { classService } from '@/services/class.service';
import { importService } from '@/services/import.service';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SearchBar from '@/components/ui/SearchBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatPhone, getRoleBadge } from '@/utils/formatters';
import type { User, Class, ImportResult } from '@/types';
import toast from 'react-hot-toast';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', classId: '', matricule: '', password: '' };
type FormData = typeof emptyForm;

export default function StudentsPage() {
  const [students, setStudents] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: pagination.page, limit: 20, role: 'STUDENT' };
      if (classFilter) params.classId = classFilter;
      if (search) params.search = search;
      const res = await userService.getUsers(params as any);
      setStudents(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch (error) {
      setStudents([]);
      toast.error(error instanceof Error ? error.message : 'Impossible de charger les élèves');
    } finally { setLoading(false); }
  }, [pagination.page, classFilter, search]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => {
    classService.getClasses().then(setClasses).catch((error) => toast.error(error instanceof Error ? error.message : 'Impossible de charger les classes'));
  }, []);

  const openCreate = () => { setEditingUser(null); setForm({ ...emptyForm }); setFormErrors({}); setModalOpen(true); };
  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phone: u.phone || '', classId: u.classId ? String(u.classId) : '', matricule: u.matricule || '', password: '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: typeof formErrors = {};
    if (!form.firstName.trim()) errors.firstName = 'Requis';
    if (!form.lastName.trim()) errors.lastName = 'Requis';
    if (!form.matricule.trim()) errors.matricule = 'Requis';
    if (!form.classId) errors.classId = 'Requis';
    if (!editingUser && !form.password) errors.password = 'Requis';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, role: 'STUDENT' };
      if (editingUser) {
        const { password: _, role: __, ...data } = payload;
        await userService.updateUser(editingUser.id, data as any);
        toast.success('Élève modifié');
      } else {
        await userService.createUser(payload as any);
        toast.success('Élève ajouté');
      }
      setModalOpen(false);
      await fetchStudents();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible d’enregistrer l’élève'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await userService.deleteUser(deleteTarget.id); toast.success('Élève désactivé'); setDeleteTarget(null); await fetchStudents(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible de désactiver l’élève'); }
    finally { setDeleting(false); }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true); setImportResult(null);
    try { const result = await importService.importStudents(importFile); setImportResult(result); toast.success(`${result.success} élèves importés`); await fetchStudents(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible d’importer les élèves'); }
    finally { setImporting(false); }
  };

  const columns: Column<User>[] = [
    { key: 'name', header: 'Nom complet', render: (u) => <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span> },
    { key: 'matricule', header: 'Matricule', render: (u) => <span className="text-sm text-gray-600">{u.matricule || '—'}</span> },
    { key: 'email', header: 'E-mail', render: (u) => <span className="text-sm text-gray-600">{u.email || '—'}</span> },
    { key: 'class', header: 'Classe', render: (u) => <span className="text-sm text-gray-600">{u.className || '—'}</span> },
    { key: 'phone', header: 'Téléphone', render: (u) => formatPhone(u.phone) },
    { key: 'isActive', header: 'Statut', render: (u) => u.isActive ? <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Actif</span> : <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Inactif</span> },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (u) => <div className="flex items-center justify-end gap-1"><button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-primary"><Pencil className="h-4 w-4" /></button><button onClick={() => setDeleteTarget(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center"><div className="w-full sm:max-w-xs"><SearchBar onSearch={(value) => { setSearch(value); setPagination((p) => ({ ...p, page: 1 })); }} placeholder="Rechercher un élève..." /></div><div className="w-full sm:w-48"><select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Toutes les classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div><div className="flex gap-2"><Button variant="secondary" onClick={() => { setImportFile(null); setImportResult(null); setImportModalOpen(true); }}><Upload className="h-4 w-4" /> Importer Excel</Button><Button onClick={openCreate}><Plus className="h-4 w-4" /> Ajouter un élève</Button></div></div>
      <Card className="!p-0 overflow-hidden"><Table columns={columns} data={students as any} loading={loading} keyExtractor={(u) => u.id} emptyMessage="Aucun élève trouvé" /></Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Modifier l\'élève' : 'Ajouter un élève'} size="lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={formErrors.firstName} icon={<UserIcon className="h-4 w-4" />} />
          <Input label="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={formErrors.lastName} />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={formErrors.email} icon={<Mail className="h-4 w-4" />} />
          <Input label="Téléphone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} icon={<Phone className="h-4 w-4" />} />
          <Input label="Matricule scolaire" value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} error={formErrors.matricule} />
          <Select label="Classe" options={classes.map(c => ({ value: c.id, label: c.name }))} value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} placeholder="Sélectionner une classe" />
          {!editingUser && <Input label="Mot de passe" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={formErrors.password} icon={<Lock className="h-4 w-4" />} />}
        </div>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editingUser ? 'Enregistrer' : 'Créer'}</Button></div>
      </Modal>
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Importer des élèves" size="md"><div className="space-y-4"><p className="text-sm text-gray-600">Importez un fichier Excel (.xlsx) contenant la liste des élèves. Les colonnes attendues : Prénom, Nom, Email, Téléphone, Matricule.</p><input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20" />{importResult && <div className="rounded-lg bg-gray-50 p-4"><p className="text-sm font-medium text-gray-700">Résultat : {importResult.success} réussis, {importResult.failed} échoués sur {importResult.total}</p>{importResult.errors.length > 0 && <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-red-600">{importResult.errors.map((err, i) => <li key={i}>Ligne {err.row} : {err.message}</li>)}</ul>}</div>}<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setImportModalOpen(false)}>Fermer</Button><Button onClick={handleImport} loading={importing} disabled={!importFile}>Importer</Button></div></div></Modal>
      <ConfirmDialog open={!!deleteTarget} title="Désactiver l'élève" message={`Voulez-vous vraiment désactiver ${deleteTarget?.firstName} ${deleteTarget?.lastName} ?`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} variant="danger" loading={deleting} />
    </div>
  );
}
