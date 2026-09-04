import { useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { User } from '@/types';
import { userService } from '@/services/user.service';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface Props { user:User; onChanged:()=>Promise<void>|void; label?:string; }
export default function UserLifecycleActions({user,onChanged,label='cet utilisateur'}:Props){
 const [mode,setMode]=useState<'deactivate'|'delete'|null>(null); const [loading,setLoading]=useState(false);
 const run=async()=>{if(!mode)return;setLoading(true);try{if(mode==='deactivate'){await userService.deleteUser(user.id);toast.success('Utilisateur désactivé.');}else{await userService.permanentlyDeleteUser(user.id);toast.success('Utilisateur supprimé définitivement.');}setMode(null);await onChanged();}catch(error){toast.error(error instanceof Error?error.message:'Opération impossible.');}finally{setLoading(false);}};
 const reactivate=async()=>{setLoading(true);try{await userService.reactivateUser(user.id);toast.success('Utilisateur réactivé.');await onChanged();}catch(error){toast.error(error instanceof Error?error.message:'Impossible de réactiver l’utilisateur.');}finally{setLoading(false);}};
 if(user.isActive)return <><button type="button" aria-label={`Désactiver ${user.firstName} ${user.lastName}`} onClick={()=>setMode('deactivate')} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button><ConfirmDialog open={mode==='deactivate'} title="Désactiver" message={`Voulez-vous vraiment désactiver ${label} ?`} onConfirm={run} onCancel={()=>setMode(null)} variant="danger" loading={loading}/></>;
 return <><button type="button" aria-label={`Réactiver ${user.firstName} ${user.lastName}`} onClick={reactivate} disabled={loading} className="rounded-md p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"><RotateCcw className="h-4 w-4"/></button><button type="button" aria-label={`Supprimer définitivement ${user.firstName} ${user.lastName}`} onClick={()=>setMode('delete')} disabled={loading} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button><ConfirmDialog open={mode==='delete'} title="Suppression définitive" message={`Cette action supprimera définitivement ${label} de la base de données. Cette opération est irréversible.`} confirmationPhrase="SUPPRIMER" onConfirm={run} onCancel={()=>setMode(null)} variant="danger" loading={loading}/></>;
}
