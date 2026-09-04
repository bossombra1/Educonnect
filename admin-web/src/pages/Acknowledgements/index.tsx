import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Mail, Download, Users, BookOpen, RefreshCw } from 'lucide-react';
import apiClient from '@/services/api';
import { messageService } from '@/services/message.service';
import { classService } from '@/services/class.service';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Table, { type Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDateTime } from '@/utils/formatters';
import type { Message, Class } from '@/types';
import toast from 'react-hot-toast';

interface Recipient { id:string; user_id:string; first_name:string; last_name:string; class_name:string; status:'delivered'|'read'|'acknowledged'|'pending'; delivered_at:string|null; read_at:string|null; acknowledged_at:string|null; }
interface RecipientStats { delivered:number; read:number; acknowledged:number; pending:number; total:number; }
const STATUS_CONFIG: Record<string,{label:string;variant:'success'|'info'|'warning'|'default'}> = { delivered:{label:'Délivré',variant:'info'}, read:{label:'Lu',variant:'success'}, acknowledged:{label:'Accusé de réception',variant:'success'}, pending:{label:'En attente',variant:'warning'} };
const STATUS_OPTIONS = [{value:'',label:'Tous les statuts'},{value:'delivered',label:'Délivré'},{value:'read',label:'Lu'},{value:'acknowledged',label:'Accusé de réception'},{value:'pending',label:'En attente'}];

export default function AcknowledgementsPage() {
  const [messages,setMessages]=useState<Message[]>([]); const [selectedMessageId,setSelectedMessageId]=useState(''); const [classes,setClasses]=useState<Class[]>([]); const [selectedClassId,setSelectedClassId]=useState(''); const [selectedStatus,setSelectedStatus]=useState('');
  const [recipients,setRecipients]=useState<Recipient[]>([]); const [loading,setLoading]=useState(false); const [page,setPage]=useState(1); const [totalPages,setTotalPages]=useState(1); const [stats,setStats]=useState<RecipientStats|null>(null); const [statsLoading,setStatsLoading]=useState(false); const [initialLoading,setInitialLoading]=useState(true); const [initialError,setInitialError]=useState<string|null>(null); const [dataError,setDataError]=useState<string|null>(null);

  const fetchInitialData=useCallback(async()=>{ setInitialLoading(true); setInitialError(null); const [mr,cr]=await Promise.allSettled([messageService.getMessages({page:1,limit:100,status:'sent'}),classService.getClasses()]); if(mr.status==='fulfilled') setMessages(mr.value.data); if(cr.status==='fulfilled') setClasses(cr.value); if(mr.status==='rejected'||cr.status==='rejected') setInitialError('Impossible de charger les messages ou les classes. Vérifiez la connexion puis réessayez.'); setInitialLoading(false); },[]);
  useEffect(()=>{ void fetchInitialData(); },[fetchInitialData]);

  const fetchRecipients=useCallback(async()=>{ if(!selectedMessageId){setRecipients([]);setStats(null);setTotalPages(1);setDataError(null);return;} setLoading(true);setStatsLoading(true);setDataError(null); const params:Record<string,string|number>={page,limit:20}; if(selectedStatus)params.status=selectedStatus;if(selectedClassId)params.class_id=selectedClassId;
    const [rr,sr]=await Promise.allSettled([apiClient.get<{data:Recipient[];pagination:{totalPages:number}}>(`/messages/${selectedMessageId}/recipients`,{params}),apiClient.get<{data:RecipientStats}>(`/messages/${selectedMessageId}/recipient-stats`)]);
    let failed=false; if(rr.status==='fulfilled'){setRecipients(rr.value.data.data||[]);setTotalPages(rr.value.data.pagination?.totalPages||1);}else failed=true; if(sr.status==='fulfilled'){const raw:any=sr.value.data.data||{}; const delivered=Number(raw.delivered)||0; const read=Number(raw.read ?? raw.read_count)||0; const acknowledged=Number(raw.acknowledged ?? raw.acknowledged_count)||0; const total=Number(raw.total)||0; setStats({total,delivered,read,acknowledged,pending:Math.max(0,total-Math.max(delivered,read,acknowledged))});}else {setStats(null);failed=true;} if(failed)setDataError('Impossible de charger les accusés de réception. Réessayez.'); setLoading(false);setStatsLoading(false);
  },[selectedMessageId,selectedClassId,selectedStatus,page]);
  useEffect(()=>{void fetchRecipients();},[fetchRecipients]); useEffect(()=>{setPage(1);},[selectedMessageId,selectedClassId,selectedStatus]);

  const handleExport=async()=>{if(!selectedMessageId){toast.error('Veuillez sélectionner un message');return;}try{const params:Record<string,string>={};if(selectedStatus)params.status=selectedStatus;if(selectedClassId)params.class_id=selectedClassId;const response=await apiClient.get(`/messages/${selectedMessageId}/acknowledgements/export`,{params,responseType:'blob'});const url=window.URL.createObjectURL(new Blob([response.data],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download=`accuses-reception-${selectedMessageId}.csv`;document.body.appendChild(link);link.click();link.remove();window.URL.revokeObjectURL(url);toast.success('Export téléchargé');}catch(error){console.error('Erreur export accusés:',error);toast.error("Erreur lors de l'export. Réessayez.");}};

  const columns:Column<Recipient>[]=[{key:'last_name',header:'Nom',render:r=><span className="font-medium text-gray-900">{r.last_name}</span>},{key:'first_name',header:'Prénom',render:r=><span className="text-gray-700">{r.first_name}</span>},{key:'class_name',header:'Classe',render:r=><span className="text-gray-600">{r.class_name||'—'}</span>},{key:'status',header:'Statut',render:r=>{const c=STATUS_CONFIG[r.status]||STATUS_CONFIG.pending;return <Badge variant={c.variant}>{c.label}</Badge>;}},{key:'delivered_at',header:'Date réception',render:r=><span className="text-sm text-gray-500">{r.delivered_at?formatDateTime(r.delivered_at):'—'}</span>},{key:'read_at',header:'Date lecture',render:r=><span className="text-sm text-gray-500">{r.read_at?formatDateTime(r.read_at):'—'}</span>},{key:'acknowledged_at',header:'Date accusé',render:r=><span className="text-sm text-gray-500">{r.acknowledged_at?formatDateTime(r.acknowledged_at):'—'}</span>}];
  if(initialLoading)return <LoadingSpinner/>;
  return <div className="space-y-6">
    {initialError&&<div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{initialError}</span><Button variant="secondary" onClick={()=>void fetchInitialData()}><RefreshCw className="h-4 w-4"/> Réessayer</Button></div>}
    <Card><div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Select label="Message" options={[{value:'',label:'Sélectionner un message'},...messages.map(m=>({value:m.id,label:m.title||m.content.slice(0,50)+'...'}))]} value={selectedMessageId} onChange={e=>setSelectedMessageId(e.target.value)}/><Select label="Classe" options={[{value:'',label:'Toutes les classes'},...classes.map(c=>({value:c.id,label:c.name}))]} value={selectedClassId} onChange={e=>setSelectedClassId(e.target.value)}/><Select label="Statut" options={STATUS_OPTIONS} value={selectedStatus} onChange={e=>setSelectedStatus(e.target.value)}/></div></Card>
    {selectedMessageId&&<div className="flex justify-end"><Button variant="secondary" onClick={handleExport} disabled={statsLoading}><Download className="h-4 w-4"/> Exporter CSV</Button></div>}
    {dataError&&<div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{dataError}</span><Button variant="secondary" onClick={()=>void fetchRecipients()}>Réessayer</Button></div>}
    {!selectedMessageId?<EmptyState icon={<Mail className="h-8 w-8"/>} title="Sélectionnez un message" description="Choisissez un message ci-dessus pour voir les accusés de réception des destinataires."/>:loading?<LoadingSpinner/>:recipients.length===0?<EmptyState icon={<BookOpen className="h-8 w-8"/>} title="Aucun destinataire" description="Aucun destinataire trouvé pour les filtres sélectionnés."/>:<Card className="!p-0 overflow-hidden"><Table columns={columns} data={recipients as any} keyExtractor={r=>r.id}/><div className="border-t border-gray-100 px-6 py-4"><Pagination page={page} totalPages={totalPages} onPageChange={setPage}/></div></Card>}
    {stats&&selectedMessageId&&<Card><div className="flex flex-wrap items-center gap-6"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400"/><span className="text-sm text-gray-500">Total :</span><b>{stats.total}</b></div><div className="text-sm">Délivrés : <b>{stats.delivered}</b> ({stats.total?((stats.delivered/stats.total)*100).toFixed(1):0}%)</div><div className="text-sm">Lus : <b>{stats.read}</b> ({stats.total?((stats.read/stats.total)*100).toFixed(1):0}%)</div><div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-emerald-500"/>Accusés : <b>{stats.acknowledged}</b> ({stats.total?((stats.acknowledged/stats.total)*100).toFixed(1):0}%)</div></div></Card>}
  </div>;
}
