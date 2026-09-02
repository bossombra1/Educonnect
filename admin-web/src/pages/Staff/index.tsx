import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, Mail, Lock, User as UserIcon, Phone } from 'lucide-react';
import { userService } from '@/services/user.service';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SearchBar from '@/components/ui/SearchBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatPhone, getRoleBadge } from '@/utils/formatters';
import type { User, UserRole } from '@/types';
import toast from 'react-hot-toast';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', role: 'STAFF' as UserRole, roleTitle: '', department: '', password: '' };
type FormData = typeof emptyForm;

const roleOptions = [
  { value: 'STAFF', label: 'Personnel' },
];

export default function StaffPage() {
  const [staff, setStaff] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: pagination.page, limit: 20, role: 'STAFF' };
      if (search) params.search = search;
      const res = await userService.getUsers(params as any);
      setStaff(res.data.filter((u) => u.role === 'STAFF'));
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch (error) {
      setStaff([]);
      toast.error(error instanceof Error ? error.message : 'Impossible de charger le personnel');
    } finally { setLoading(false); }
  }, [pagination.page, search]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const openCreate = () => { setEditingUser(null); setForm(emptyForm); setFormErrors({}); setModalOpen(true); };
  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone || '', role: 'STAFF', roleTitle: (u as any).roleTitle || (u as any).role_title || '', department: (u as any).department || '', password: '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: typeof formErrors = {};
    if (!form.firstName.trim()) errors.firstName = 'Requis';
    if (!form.lastName.trim()) errors.lastName = 'Requis';
    if (!form.email.trim()) errors.email = 'Requis';
    if (!form.roleTitle.trim()) errors.roleTitle = 'Requis';
    if (!editingUser && !form.password) errors.password = 'Requis';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, role: 'STAFF' as const, role_title: form.roleTitle, department: form.department };
      if (editingUser) {
        const { password: _, role: __, ...data } = payload;
        await userService.updateUser(editingUser.id, data as any);
        toast.success('Personnel modifié');
      } else {
        await userService.createUser(payload as any);
        toast.success('Personnel ajouté');
      }
      setModalOpen(false);
      await fetchStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Opération impossible');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await userService.deleteUser(deleteTarget.id); toast.success('Personnel désactivé'); setDeleteTarget(null); await fetchStaff(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Suppression impossible'); }
    finally { setDeleting(false); }
  };

  const columns: Column<User>[] = [
    { key: 'name', header: 'Nom complet', render: (u) => <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span> },
    { key: 'matricule', header: 'Matricule', render: (u) => <span className="text-sm text-gray-600">{u.matricule || '—'}</span> },
    { key: 'role', header: 'Rôle', render: (u) => { const b = getRoleBadge('STAFF'); return <span className={b.className}>{b.label}</span>; } },
    { key: 'fonction', header: 'Fonction', render: (u) => <span className="text-sm text-gray-600">{(u as any).roleTitle || (u as any).role_title || '—'}</span> },
    { key: 'departement', header: 'Département', render: (u) => <span className="text-sm text-gray-600">{(u as any).department || '—'}</span> },
    { key: 'phone', header: 'Téléphone', render: (u) => formatPhone(u.phone) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (u) => <div className="flex items-center justify-end gap-1"><button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-primary"><Pencil className="h-4 w-4" /></button><button onClick={() => setDeleteTarget(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center"><div className="w-full sm:max-w-xs"><SearchBar onSearch={setSearch} placeholder="Rechercher du personnel..." /></div><div className="w-full sm:w-48"><select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Tous les rôles</option>{roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div></div><Button onClick={openCreate}><Plus className="h-4 w-4" /> Ajouter du personnel</Button></div>
      <Card className="!p-0 overflow-hidden"><Table columns={columns} data={staff as any} loading={loading} keyExtractor={(u) => u.id} emptyMessage="Aucun personnel trouvé" /></Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Modifier le personnel' : 'Ajouter du personnel'} size="lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={formErrors.firstName} icon={<UserIcon className="h-4 w-4" />} />
          <Input label="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={formErrors.lastName} />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={formErrors.email} icon={<Mail className="h-4 w-4" />} />
          <Input label="Téléphone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} icon={<Phone className="h-4 w-4" />} />
          <Select label="Rôle" options={roleOptions} value="STAFF" onChange={() => undefined} />
          <Input label="Fonction" value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} placeholder="Ex: Professeur de maths" error={formErrors.roleTitle} />
          <Input label="Département" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Ex: Sciences" />
          {!editingUser && <Input label="Mot de passe" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={formErrors.password} icon={<Lock className="h-4 w-4" />} />}
        </div>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editingUser ? 'Enregistrer' : 'Créer'}</Button></div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} title="Désactiver" message={`Voulez-vous vraiment désactiver ${deleteTarget?.firstName} ${deleteTarget?.lastName} ?`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} variant="danger" loading={deleting} />
    </div>
  );
}
