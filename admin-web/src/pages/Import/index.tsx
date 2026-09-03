import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, RotateCcw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import apiClient from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Table, { type Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination from '@/components/ui/Pagination';
import { formatDateTime } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface UploadResult { import_id: number; filename: string; total_rows: number; columns: string[]; preview: Record<string, string>[]; }
interface ImportRecord { id: number; filename: string; total_rows: number; imported: number; failed: number; status: 'pending' | 'processing' | 'completed' | 'failed'; errors: { row: number; message: string }[]; created_at: string; completed_at?: string; }
interface ImportHistoryResponse { data: ImportRecord[]; total: number; page: number; totalPages: number; }
const DATABASE_FIELDS = [
  { value: 'matricule', label: 'Matricule' }, { value: 'first_name', label: 'Prénom' }, { value: 'last_name', label: 'Nom' },
  { value: 'phone', label: 'Téléphone' }, { value: 'email', label: 'E-mail' }, { value: 'role', label: 'Rôle' },
  { value: 'class', label: 'Classe' }, { value: 'level', label: 'Niveau' },
];
const EMPTY_MAPPING: Record<string, string> = { matricule: '', first_name: '', last_name: '', phone: '', email: '', role: '', class: '', level: '' };
type Step = 'upload' | 'mapping' | 'importing' | 'result';

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({ ...EMPTY_MAPPING });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingFailuresRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { data } = await apiClient.get<ImportHistoryResponse>('/imports/history', { params: { page, limit: 10 } });
      setImportHistory(data.data);
      setHistoryTotalPages(data.totalPages);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Impossible de charger l’historique des imports.');
    } finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(historyPage); }, [historyPage, fetchHistory]);
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const handleFileSelect = (files: File[]) => {
    if (!files.length) return;
    const selected = files[0];
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (!validTypes.includes(selected.type) && !selected.name.match(/\.(xlsx|xls|csv)$/i)) { toast.error('Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV'); return; }
    setFile(selected); setUploadResult(null); setColumnMapping({ ...EMPTY_MAPPING }); setImportResult(null); setPollingError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const { data } = await apiClient.post<{ success: boolean; data: UploadResult }>('/imports/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadResult(data.data);
      const mapping = { ...EMPTY_MAPPING };
      const aliases: Record<string, string[]> = {
        matricule: ['matricule', 'mat', 'id', 'numéro', 'numero', 'n°'], first_name: ['prénom', 'prenom', 'first_name', 'firstname', 'given name'],
        last_name: ['nom', 'last_name', 'lastname', 'nom de famille', 'family name'], phone: ['téléphone', 'telephone', 'phone', 'tel', 'mobile', 'portable'],
        email: ['email', 'e-mail', 'courriel', 'mail'], role: ['rôle', 'role', 'statut'], class: ['classe', 'class', 'groupe', 'section'], level: ['niveau', 'level', 'année', 'annee', 'grade'],
      };
      const lower = (data.data.columns || []).map(c => c.toLowerCase().trim());
      for (const [field, names] of Object.entries(aliases)) { const i = lower.findIndex(c => names.includes(c)); if (i >= 0) mapping[field] = data.data.columns[i]; }
      setColumnMapping(mapping); setStep('mapping');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur lors de l’analyse du fichier.'); }
    finally { setUploading(false); }
  };

  const startPolling = useCallback((importId: number) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingFailuresRef.current = 0; setPollingError(null);
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await apiClient.get<{ success: boolean; data: ImportRecord }>(`/imports/${importId}/status`);
        pollingFailuresRef.current = 0; setPollingError(null);
        const record = data.data; const total = record.total_rows || 1; const processed = record.imported + record.failed;
        setImportProgress(Math.min(100, (processed / total) * 100));
        if (record.status === 'completed' || record.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current); pollingRef.current = null; setImporting(false);
          setImportResult({ imported: record.imported, failed: record.failed, errors: record.errors || [] }); setImportProgress(100); setStep('result');
          setHistoryPage(1); fetchHistory(1);
          if (record.failed === 0) toast.success(`${record.imported} ligne(s) importée(s) avec succès`); else toast.success(`${record.imported} importée(s), ${record.failed} échouée(s)`);
        }
      } catch (error) {
        pollingFailuresRef.current += 1;
        const message = error instanceof Error ? error.message : 'Impossible de suivre la progression de l’import.';
        if (pollingFailuresRef.current >= 3) {
          if (pollingRef.current) clearInterval(pollingRef.current); pollingRef.current = null; setImporting(false);
          setPollingError(`Le suivi de l’import a échoué à plusieurs reprises. ${message}`);
        } else { setPollingError(`Suivi temporairement indisponible (${pollingFailuresRef.current}/3). ${message}`); }
      }
    }, 2000);
  }, [fetchHistory]);

  const handleStartImport = async () => {
    if (!uploadResult) return;
    const activeMapping: Record<string, string> = {};
    for (const [field, col] of Object.entries(columnMapping)) if (col) activeMapping[field] = col;
    if (!Object.keys(activeMapping).length) { toast.error('Veuillez mapper au moins une colonne'); return; }
    setImporting(true); setImportProgress(0); setStep('importing'); setPollingError(null);
    try { await apiClient.post(`/imports/${uploadResult.import_id}/start`, { column_mapping: activeMapping }); startPolling(uploadResult.import_id); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur lors du démarrage de l’import'); setImporting(false); setStep('mapping'); }
  };

  const handleRetryPolling = () => { if (uploadResult) { setImporting(true); setStep('importing'); startPolling(uploadResult.import_id); } };
  const handleReset = () => { if (pollingRef.current) clearInterval(pollingRef.current); pollingRef.current = null; setFile(null); setUploadResult(null); setColumnMapping({ ...EMPTY_MAPPING }); setImportProgress(0); setImportResult(null); setImporting(false); setPollingError(null); setStep('upload'); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); handleFileSelect(Array.from(e.dataTransfer.files)); };
  const getStatusBadge = (status: string) => status === 'completed' ? <Badge variant="success">Terminé</Badge> : status === 'processing' ? <Badge variant="info">En cours</Badge> : status === 'failed' ? <Badge variant="danger">Échoué</Badge> : <Badge variant="warning">En attente</Badge>;

  const historyColumns: Column<ImportRecord>[] = [
    { key: 'filename', header: 'Fichier', render: r => <div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-emerald-600" /><span className="font-medium text-slate-900">{r.filename}</span></div> },
    { key: 'total_rows', header: 'Lignes', render: r => <span className="text-slate-700">{r.total_rows}</span> },
    { key: 'imported', header: 'Importées', render: r => <span className={cn('font-medium', r.imported > 0 ? 'text-emerald-700' : 'text-slate-400')}>{r.imported}</span> },
    { key: 'failed', header: 'Échouées', render: r => <span className={cn('font-medium', r.failed > 0 ? 'text-red-700' : 'text-slate-400')}>{r.failed}</span> },
    { key: 'status', header: 'Statut', render: r => getStatusBadge(r.status) },
    { key: 'created_at', header: 'Date', render: r => <span className="text-xs text-muted">{formatDateTime(r.created_at)}</span> },
  ];

  const steps: Step[] = ['upload', 'mapping', 'importing', 'result'];
  const stepIndex = steps.indexOf(step);

  return <div className="space-y-5">
    <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Données</p><h1 className="text-xl font-semibold tracking-tight text-slate-900">Import des données</h1><p className="mt-1 text-sm text-muted">Importez des fichiers Excel ou CSV et contrôlez chaque étape du traitement.</p></div>
    </header>

    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-3 py-3 shadow-sm">
      {steps.map((s, i) => <div key={s} className="flex items-center gap-2"><div className={cn('flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold', step === s ? 'bg-primary text-white' : i < stepIndex ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400')}>{i < stepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}</div><span className={cn('text-xs font-medium', step === s ? 'text-slate-900' : 'text-slate-400')}>{s === 'upload' ? 'Fichier' : s === 'mapping' ? 'Mappage' : s === 'importing' ? 'Import' : 'Résultat'}</span>{i < 3 && <div className="h-px w-6 bg-line sm:w-10" />}</div>)}
    </div>

    {step === 'upload' && <Card>
      <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-surface px-5 py-12 text-center transition hover:border-primary-300 focus-within:border-primary-300">
        <div className="mb-4 rounded-lg bg-primary-50 p-3"><Upload className="h-7 w-7 text-primary" /></div>
        <p className="text-sm font-semibold text-slate-900">Cliquez ou glissez votre fichier ici</p>
        <p className="mt-1 text-xs text-muted">Excel (.xlsx, .xls) ou CSV</p>
        {file && <div className="mt-4 flex max-w-full items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2"><FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-700" /><span className="truncate text-xs font-medium text-emerald-800">{file.name}</span></div>}
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => e.target.files && handleFileSelect(Array.from(e.target.files))} className="hidden" />
      </div>
      <div className="mt-4 flex justify-end"><Button onClick={handleUpload} loading={uploading} disabled={!file}><Upload className="h-4 w-4" /> Analyser le fichier</Button></div>
    </Card>}

    {step === 'mapping' && uploadResult && <div className="space-y-4"><Card title="Mappage des colonnes"><p className="mb-4 text-xs text-muted">Associez les colonnes du fichier aux champs de la base. <span className="font-medium text-slate-700">{uploadResult.filename}</span> · {uploadResult.total_rows} ligne(s)</p><div className="overflow-x-auto rounded-md border border-line"><table className="w-full"><thead><tr className="border-b border-line bg-slate-50"><th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Champ base de données</th><th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Colonne Excel</th></tr></thead><tbody>{DATABASE_FIELDS.map(field => <tr key={field.value} className="border-b border-line last:border-0 hover:bg-slate-50"><td className="px-3 py-2 text-xs font-medium text-slate-900">{field.label}</td><td className="px-3 py-2"><Select options={[{value:'',label:'— Ne pas importer —'}, ...uploadResult.columns.map(col => ({value:col,label:col}))]} value={columnMapping[field.value] || ''} onChange={e => setColumnMapping(prev => ({...prev,[field.value]:e.target.value}))} /></td></tr>)}</tbody></table></div>{uploadResult.preview?.length > 0 && <div className="mt-5 overflow-x-auto"><h4 className="mb-2 text-xs font-semibold text-slate-800">Aperçu des données</h4><table className="w-full"><thead><tr className="border-b border-line bg-slate-50">{Object.keys(uploadResult.preview[0]).map(col => <th key={col} className="px-3 py-2 text-left text-[11px] font-semibold text-muted">{col}</th>)}</tr></thead><tbody>{uploadResult.preview.slice(0,5).map((row,i) => <tr key={i} className="border-b border-line last:border-0">{Object.values(row).map((v,j) => <td key={j} className="px-3 py-2 text-xs text-slate-700">{v || '—'}</td>)}</tr>)}</tbody></table></div>}</Card><div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"><Button variant="ghost" onClick={handleReset}><RotateCcw className="h-4 w-4" /> Recommencer</Button><Button onClick={handleStartImport} disabled={!Object.values(columnMapping).some(Boolean)}><Upload className="h-4 w-4" /> Importer</Button></div></div>}

    {step === 'importing' && <Card><div className="flex flex-col items-center py-10 text-center"><div className="mb-4 rounded-lg bg-primary-50 p-3"><Clock className="h-7 w-7 animate-pulse text-primary" /></div><h3 className="text-base font-semibold text-slate-900">Import en cours...</h3><p className="mt-1 text-xs text-muted">Veuillez patienter pendant le traitement des données.</p><div className="mt-5 w-full max-w-md"><ProgressBar value={importProgress} color="blue" label="Progression" /></div>{pollingError && <div className="mt-4 w-full max-w-md rounded-md border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700"><p>{pollingError}</p><div className="mt-2"><Button variant="ghost" onClick={handleRetryPolling}>Réessayer le suivi</Button></div></div>}</div></Card>}

    {step === 'result' && importResult && <div className="space-y-4"><Card><h3 className="text-base font-semibold text-slate-900">Résumé de l'import</h3><p className="mt-1 text-xs text-muted">Fichier : {uploadResult?.filename} · {uploadResult?.total_rows} ligne(s) au total</p><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-md border border-line bg-surface p-4"><p className="text-2xl font-semibold tracking-tight text-slate-900">{uploadResult?.total_rows || 0}</p><p className="mt-1 text-xs font-medium text-muted">Total</p></div><div className="rounded-md border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-700" /><p className="text-2xl font-semibold tracking-tight text-emerald-800">{importResult.imported}</p></div><p className="mt-1 text-xs font-medium text-emerald-700">Importées avec succès</p></div><div className="rounded-md border border-red-200 bg-red-50 p-4"><div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-700" /><p className="text-2xl font-semibold tracking-tight text-red-800">{importResult.failed}</p></div><p className="mt-1 text-xs font-medium text-red-700">Échouées</p></div></div>{importResult.errors.length > 0 && <div className="mt-5"><button onClick={() => setExpandedErrors(expandedErrors === 1 ? null : 1)} className="flex items-center gap-2 text-xs font-semibold text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{expandedErrors === 1 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Détails des erreurs ({importResult.errors.length})</button>{expandedErrors === 1 && <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-red-200 bg-red-50"><table className="w-full"><tbody>{importResult.errors.map((err,i) => <tr key={i} className="border-b border-red-100 last:border-0"><td className="px-3 py-2 text-xs font-medium text-red-800">{err.row}</td><td className="px-3 py-2 text-xs text-red-700">{err.message}</td></tr>)}</tbody></table></div>}</div>}</Card><div><Button variant="ghost" onClick={handleReset}><RotateCcw className="h-4 w-4" /> Nouvel import</Button></div></div>}

    <Card title="Historique des imports">{historyLoading ? <LoadingSpinner /> : historyError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"><p>Impossible de charger l’historique. {historyError}</p><div className="mt-2"><Button variant="ghost" onClick={() => fetchHistory(historyPage)}>Réessayer</Button></div></div> : importHistory.length === 0 ? <EmptyState icon={<FileSpreadsheet className="h-7 w-7" />} title="Aucun import" description="Les imports effectués apparaîtront ici." /> : <><div className="overflow-x-auto"><Table columns={historyColumns} data={importHistory} keyExtractor={r => String(r.id)} /></div><div className="mt-3"><Pagination page={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} /></div></>}</Card>
  </div>;
}