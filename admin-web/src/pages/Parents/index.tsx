import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, Eye, Mail, Lock, User as UserIcon, Phone } from 'lucide-react';
import { userService } from '@/services/user.service';
import Table, { type Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import SearchBar from '@/components/ui/SearchBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatPhone } from '@/utils/formatters';
import type { User } from '@/types';
import toast from 'react-hot-toast';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', password: '' };
type FormData = typeof emptyForm;

export default function ParentsPage() {
  const [parents, setParents] = useState<User[]>([]); const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 }); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState<string | null>(null); const [childrenError, setChildrenError] = useState<string | null>(null); const [search, setSearch] = useState(''); const [modalOpen, setModalOpen] = useState(false); const [childrenModal, setChildrenModal] = useState<User | null>(null); const [children, setChildren] = useState<User[]>([]); const [childrenLoading, setChildrenLoading] = useState(false); const [editingUser, setEditingUser] = useState<User | null>(null); const [form, setForm] = useState<FormData>({ ...emptyForm }); const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({}); const [deleteTarget, setDeleteTarget] = useState<User | null>(null); const [deleting, setDeleting] = useState(false); const [saving, setSaving] = useState(false);

  const fetchParents = useCallback(async () => { setLoading(true); setLoadError(null); try { const params: Record<string,string|number>={ page:pagination.page,limit:20,role:'PARENT' }; if(search)params.search=search; const res=await userService.getUsers(params as any); setParents(res.data); setPagination({page:res.pagination.page,totalPages:res.pagination.totalPages,total:res.pagination.total}); } catch(error){const message=error instanceof Error?error.message:'Impossible de charger les parents';setLoadError(message);toast.error(message);} finally{setLoading(false);} },[pagination.page,search]);
  useEffect(()=>{fetchParents();},[fetchParents]);
  const openCreate=()=>{setEditingUser(null);setForm({...emptyForm});setFormErrors({});setModalOpen(true);};
  const openEdit=(u:User)=>{setEditingUser(u);setForm({firstName:u.firstName||'',lastName:u.lastName||'',email:u.email||'',phone:u.phone||'',password:''});setFormErrors({});setModalOpen(true);};
  const showChildren=async(parent:User)=>{setChildrenModal(parent);setChildrenLoading(true);setChildrenError(null);try{setChildren(await userService.getStudentsByParent(parent.id));}catch(error){const message=error instanceof Error?error.message:'Impossible de charger les enfants';setChildrenError(message);toast.error(message);}finally{setChildrenLoading(false);}};
  const validate=():boolean=>{const errors:typeof formErrors={};if(!form.firstName.trim())errors.firstName='Requis';if(!form.lastName.trim())errors.lastName='Requis';if(!editingUser&&!form.password)errors.password='Requis';setFormErrors(errors);return Object.keys(errors).length===0;};
  const handleSave=async()=>{if(!validate())return;setSaving(true);try{if(editingUser){const data={firstName:form.firstName,lastName:form.lastName,email:form.email,phone:form.phone};await userService.updateUser(editingUser.id,data as any);toast.success('Parent modifié');}else{await userService.createUser({...form,role:'PARENT'} as any);toast.success('Parent ajouté');}setModalOpen(false);await fetchParents();}catch(error){toast.error(error instanceof Error?error.message:'Impossible d’enregistrer le parent');}finally{setSaving(false);}};
  const handleDelete=async()=>{if(!deleteTarget)return;setDeleting(true);try{await userService.deleteUser(deleteTarget.id);toast.success('Parent désactivé');setDeleteTarget(null);await fetchParents();}catch(error){toast.error(error instanceof Error?error.message:'Impossible de désactiver le parent');}finally{setDeleting(false);}};

  const columns:Column<User>=[
    {key:'name',header:'Nom complet',render:u=><span className="font-medium text-slate-900">{u.firstName} {u.lastName}</span>},
    {key:'matricule',header:'Matricule',render:u=><span className="text-sm text-slate-600">{u.matricule||'—'}</span>},
    {key:'email',header:'E-mail',render:u=><span className="text-sm text-slate-600">{u.email||'—'}</span>},
    {key:'phone',header:'Téléphone',render:u=><span className="text-sm text-slate-600">{formatPhone(u.phone)}</span>},
    {key:'children',header:'Enfants',render:u=><button aria-label={`Voir les enfants de ${u.firstName} ${u.lastName}`} onClick={()=>showChildren(u)} className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary hover:bg-primary-100 focus-visible:outline-none"><Eye className="h-3 w-3"/>Voir</button>},
    {key:'isActive',header:'Statut',render:u=>u.isActive?<span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Actif</span>:<span className="inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Inactif</span>},
    {key:'actions',header:'Actions',className:'text-right',render:u=><div className="flex items-center justify-end gap-1"><button aria-label={`Modifier ${u.firstName} ${u.lastName}`} onClick={()=>openEdit(u)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary focus-visible:text-primary"><Pencil className="h-4 w-4"/></button><button aria-label={`Désactiver ${u.firstName} ${u.lastName}`} onClick={()=>setDeleteTarget(u)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:text-red-600"><Trash2 className="h-4 w-4"/></button></div>}
  ];

  return <div className="space-y-5">
    {loadError&&<div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{loadError}</span><Button variant="secondary" onClick={fetchParents}>Réessayer</Button></div>}
    <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-xl font-semibold tracking-tight text-slate-900">Parents</h1><p className="mt-1 text-sm text-muted">Gérez les responsables et consultez les élèves qui leur sont rattachés.</p></div><Button onClick={openCreate}><Plus className="h-4 w-4"/>Ajouter un parent</Button></div>
    <div className="w-full sm:max-w-sm"><SearchBar onSearch={v=>{setSearch(v);setPagination(p=>({...p,page:1}));}} placeholder="Rechercher un parent..."/></div>
    <Card className="!p-0 overflow-hidden"><Table columns={columns} data={parents as any} loading={loading} keyExtractor={u=>u.id} emptyMessage="Aucun parent trouvé"/></Card>
    <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editingUser?'Modifier le parent':'Ajouter un parent'} size="lg"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Prénom" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} error={formErrors.firstName} icon={<UserIcon className="h-4 w-4"/>}/><Input label="Nom" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} error={formErrors.lastName}/><Input label="E-mail" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} icon={<Mail className="h-4 w-4"/>}/><Input label="Téléphone" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} icon={<Phone className="h-4 w-4"/>}/>{!editingUser&&<Input label="Mot de passe" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} error={formErrors.password} icon={<Lock className="h-4 w-4"/>}/>}</div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={()=>setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editingUser?'Enregistrer':'Créer'}</Button></div></Modal>
    <Modal open={!!childrenModal} onClose={()=>{setChildrenModal(null);setChildrenError(null);}} title={`Enfants de ${childrenModal?.firstName} ${childrenModal?.lastName}`}>{childrenLoading?<div className="py-8 text-center text-slate-400">Chargement...</div>:childrenError?<div role="alert" className="space-y-3 py-6 text-center"><p className="text-sm text-red-600">{childrenError}</p><Button variant="secondary" onClick={()=>childrenModal&&showChildren(childrenModal)}>Réessayer</Button></div>:children.length===0?<div className="py-8 text-center text-slate-400">Aucun enfant trouvé</div>:<div className="divide-y divide-line rounded-md border border-line">{children.map(c=><div key={c.id} className="flex items-center gap-3 p-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-sm font-medium text-amber-700">{c.firstName[0]}{c.lastName[0]}</div><div><p className="text-sm font-medium text-slate-900">{c.firstName} {c.lastName}</p><p className="text-xs text-muted">{c.email||'—'}</p></div></div>)}</div>}</Modal>
    <ConfirmDialog open={!!deleteTarget} title="Désactiver le parent" message={`Voulez-vous vraiment désactiver ${deleteTarget?.firstName} ${deleteTarget?.lastName} ?`} onConfirm={handleDelete} onCancel={()=>setDeleteTarget(null)} variant="danger" loading={deleting}/>
  </div>;
}
