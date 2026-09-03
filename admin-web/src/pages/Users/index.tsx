import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, Mail, Lock, User as UserIcon, Phone } from 'lucide-react';
import { userService } from '@/services/user.service';
import { classService } from '@/services/class.service';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import SearchBar from '@/components/ui/SearchBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatPhone, getRoleBadge } from '@/utils/formatters';
import type { User, UserRole, Class } from '@/types';
import toast from 'react-hot-toast';

const roleOptions = [
  { value: 'STUDENT', label: 'Élève' }, { value: 'PARENT', label: 'Parent' },
  { value: 'TEACHER', label: 'Enseignant' }, { value: 'STAFF', label: 'Personnel' }, { value: 'ADMIN', label: 'Admin' },
];
const emptyForm = { firstName: '', lastName: '', email: '', phone: '', role: 'STUDENT' as UserRole, classId: '', password: '' };
type FormData = typeof emptyForm;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState(''); const [roleFilter, setRoleFilter] = useState(''); const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState<Class[]>([]); const [classesError, setClassesError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false); const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm); const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null); const [deleting, setDeleting] = useState(false); const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try { const params: Record<string, string | number> = { page: pagination.page, limit: 20 }; if (roleFilter) params.role = roleFilter; if (classFilter) params.classId = classFilter; if (search) params.search = search; const res = await userService.getUsers(params as any); setUsers(res.data); setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total }); }
    catch (error) { console.error('Erreur lors du chargement des utilisateurs:', error); setLoadError(error instanceof Error ? error.message : 'Impossible de charger les utilisateurs'); }
    finally { setLoading(false); }
  }, [pagination.page, roleFilter, classFilter, search]);

  const fetchClasses = useCallback(async () => {
    setClassesError(null);
    try { setClasses(await classService.getClasses()); } catch (error) { console.error('Erreur lors du chargement des classes:', error); setClassesError(error instanceof Error ? error.message : 'Impossible de charger les classes'); }
  }, []);
  useEffect(() => { fetchUsers(); }, [fetchUsers]); useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const openCreate = () => { setEditingUser(null); setForm(emptyForm); setFormErrors({}); setModalOpen(true); };
  const openEdit = (user: User) => { setEditingUser(user); setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone || '', role: user.role, classId: (user as any).classId || '', password: '' }); setFormErrors({}); setModalOpen(true); };
  const validate = (): boolean => { const errors: typeof formErrors = {}; if (!form.firstName.trim()) errors.firstName = 'Le prénom est requis'; if (!form.lastName.trim()) errors.lastName = 'Le nom est requis'; if (!form.email.trim()) errors.email = "L'e-mail est requis"; else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'E-mail invalide'; if (!editingUser && !form.password) errors.password = 'Le mot de passe est requis'; setFormErrors(errors); return Object.keys(errors).length === 0; };
  const handleSave = async () => { if (!validate()) return; setSaving(true); try { if (editingUser) { const { password: _, ...updateData } = form; await userService.updateUser(editingUser.id, updateData); toast.success('Utilisateur modifié avec succès'); } else { await userService.createUser(form); toast.success('Utilisateur créé avec succès'); } setModalOpen(false); await fetchUsers(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Opération impossible'); } finally { setSaving(false); } };
  const handleDelete = async () => { if (!deleteTarget) return; setDeleting(true); try { await userService.deleteUser(deleteTarget.id); toast.success('Utilisateur supprimé'); setDeleteTarget(null); await fetchUsers(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Suppression impossible'); } finally { setDeleting(false); } };

  const columns: Column<User>[] = [
    { key: 'id', header: 'Matricule', render: (u) => <span className="font-mono text-xs text-gray-500">{u.matricule || u.id.slice(0, 8)}</span> },
    { key: 'name', header: 'Nom complet', render: (u) => <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span> },
    { key: 'role', header: 'Rôle', render: (u) => { const b = getRoleBadge(u.role); return <Badge className={b.className}>{b.label}</Badge>; } },
    { key: 'phone', header: 'Téléphone', render: (u) => formatPhone(u.phone) },
    { key: 'isActive', header: 'Statut', render: (u) => u.isActive ? <Badge variant="success">Actif</Badge> : <Badge variant="danger">Inactif</Badge> },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (u) => <div className="flex items-center justify-end gap-1"><button aria-label={`Modifier ${u.firstName} ${u.lastName}`} onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-primary"><Pencil className="h-4 w-4" /></button><button aria-label={`Supprimer ${u.firstName} ${u.lastName}`} onClick={() => setDeleteTarget(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div> },
  ];

  return (<div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center"><div className="w-full sm:max-w-xs"><SearchBar onSearch={setSearch} placeholder="Rechercher un utilisateur..." /></div><div className="w-full sm:w-40"><select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><option value="">Tous les rôles</option>{roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div><div className="w-full sm:w-40"><select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><option value="">Toutes les classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div><Button onClick={openCreate}><Plus className="h-4 w-4" /> Ajouter un utilisateur</Button></div>
    {loadError && <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{loadError}</span><Button variant="secondary" size="sm" onClick={fetchUsers}>Réessayer</Button></div>}
    {classesError && <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{classesError}</span><Button variant="secondary" size="sm" onClick={fetchClasses}>Réessayer les classes</Button></div>}
    <Card className="!p-0 overflow-hidden"><Table columns={columns} data={users as any} loading={loading} keyExtractor={(u) => u.id} emptyMessage="Aucun utilisateur trouvé" /></Card>
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'} size="lg"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={formErrors.firstName} icon={<UserIcon className="h-4 w-4" />} /><Input label="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={formErrors.lastName} /><Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={formErrors.email} icon={<Mail className="h-4 w-4" />} /><Input label="Téléphone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} icon={<Phone className="h-4 w-4" />} /><Select label="Rôle" options={roleOptions} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} />{!editingUser && <Input label="Mot de passe" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={formErrors.password} icon={<Lock className="h-4 w-4" />} />}</div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editingUser ? 'Enregistrer' : 'Créer'}</Button></div></Modal>
    <ConfirmDialog open={!!deleteTarget} title="Supprimer l'utilisateur" message={`Voulez-vous vraiment supprimer ${deleteTarget?.firstName} ${deleteTarget?.lastName} ? Cette action est irréversible.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} variant="danger" loading={deleting} />
  </div>);
}
