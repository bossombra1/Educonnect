import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, Eye } from 'lucide-react';
import { userService } from '@/services/user.service';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import SearchBar from '@/components/ui/SearchBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatPhone, getRoleBadge } from '@/utils/formatters';
import type { User } from '@/types';
import toast from 'react-hot-toast';
import { Mail, Lock, User as UserIcon, Phone } from 'lucide-react';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', password: '' };
type FormData = typeof emptyForm;

export default function ParentsPage() {
  const [parents, setParents] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [childrenModal, setChildrenModal] = useState<User | null>(null);
  const [children, setChildren] = useState<User[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: pagination.page, limit: 20, role: 'PARENT' };
      if (search) params.search = search;
      const res = await userService.getUsers(params as any);
      setParents(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { setParents([]); }
    finally { setLoading(false); }
  }, [pagination.page, search]);

  useEffect(() => { fetchParents(); }, [fetchParents]);

  const openCreate = () => { setEditingUser(null); setForm(emptyForm); setFormErrors({}); setModalOpen(true); };
  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone || '', password: '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const showChildren = async (parent: User) => {
    setChildrenModal(parent);
    setChildrenLoading(true);
    try {
      const res = await userService.getUsers({ role: 'STUDENT', parentId: parent.id } as any);
      setChildren(res.data);
    } catch { setChildren([]); }
    finally { setChildrenLoading(false); }
  };

  const validate = (): boolean => {
    const errors: typeof formErrors = {};
    if (!form.firstName.trim()) errors.firstName = 'Requis';
    if (!form.lastName.trim()) errors.lastName = 'Requis';
    if (!form.email.trim()) errors.email = 'Requis';
    if (!editingUser && !form.password) errors.password = 'Requis';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingUser) {
        const { password: _, ...data } = form;
        await userService.updateUser(editingUser.id, data as any);
        toast.success('Parent modifié');
      } else {
        await userService.createUser({ ...form, role: 'PARENT' } as any);
        toast.success('Parent ajouté');
      }
      setModalOpen(false);
      fetchParents();
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await userService.deleteUser(deleteTarget.id); toast.success('Parent supprimé'); setDeleteTarget(null); fetchParents(); }
    catch {}
    finally { setDeleting(false); }
  };

  const columns: Column<User>[] = [
    { key: 'name', header: 'Nom complet', render: (u) => <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span> },
    { key: 'email', header: 'E-mail', render: (u) => <span className="text-sm text-gray-600">{u.email}</span> },
    { key: 'phone', header: 'Téléphone', render: (u) => formatPhone(u.phone) },
    { key: 'children', header: 'Enfants', render: (u) => {
      const count = (u as any).children?.length ?? '—';
      if (count === '—') return <span className="text-gray-400">—</span>;
      return (
        <button onClick={() => showChildren(u)} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-primary hover:bg-blue-100">
          <Eye className="h-3 w-3" /> {count} enfant(s)
        </button>
      );
    }},
    { key: 'isActive', header: 'Statut', render: (u) => u.isActive ? <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Actif</span> : <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Inactif</span> },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (u) => (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-primary"><Pencil className="h-4 w-4" /></button>
        <button onClick={() => setDeleteTarget(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs"><SearchBar onSearch={setSearch} placeholder="Rechercher un parent..." /></div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Ajouter un parent</Button>
      </div>

      <Card className="!p-0 overflow-hidden">
        <Table columns={columns} data={parents as any} loading={loading} keyExtractor={(u) => u.id} emptyMessage="Aucun parent trouvé" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Modifier le parent' : 'Ajouter un parent'} size="lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={formErrors.firstName} icon={<UserIcon className="h-4 w-4" />} />
          <Input label="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={formErrors.lastName} />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={formErrors.email} icon={<Mail className="h-4 w-4" />} />
          <Input label="Téléphone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} icon={<Phone className="h-4 w-4" />} />
          {!editingUser && <Input label="Mot de passe" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={formErrors.password} icon={<Lock className="h-4 w-4" />} />}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editingUser ? 'Enregistrer' : 'Créer'}</Button>
        </div>
      </Modal>

      {/* Children Modal */}
      <Modal open={!!childrenModal} onClose={() => setChildrenModal(null)} title={`Enfants de ${childrenModal?.firstName} ${childrenModal?.lastName}`}>
        {childrenLoading ? <div className="py-8 text-center text-gray-400">Chargement...</div> : children.length === 0 ? <div className="py-8 text-center text-gray-400">Aucun enfant trouvé</div> : (
          <div className="space-y-2">
            {children.map(c => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-sm font-medium text-amber-700">{c.firstName[0]}{c.lastName[0]}</div>
                <div><p className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</p><p className="text-xs text-gray-400">{c.email}</p></div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Supprimer le parent" message={`Voulez-vous vraiment supprimer ${deleteTarget?.firstName} ${deleteTarget?.lastName} ?`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} variant="danger" loading={deleting} />
    </div>
  );
}