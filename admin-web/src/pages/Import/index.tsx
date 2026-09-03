import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, RotateCcw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import apiClient from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table, { type Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination from '@/components/ui/Pagination';
import { formatDateTime } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface ImportResult { totalRows: number; successCount: number; failCount: number; errors: { row: number; message: string }[]; }
interface ImportRecord { id: number; filename: string; total_rows: number; imported_rows: number; failed_rows: number; status: 'pending' | 'processing' | 'completed' | 'failed'; error_log?: { row: number; message: string }[] | string | null; created_at: string; completed_at?: string; }
interface ImportHistoryResponse { success: boolean; data: ImportRecord[]; pagination: { page: number; limit: number; total: number; totalPages: number }; }

type Step = 'upload' | 'importing' | 'result';

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedErrors, setExpandedErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { data } = await apiClient.get<ImportHistoryResponse>('/imports/history', { params: { page, limit: 10 } });
      setImportHistory(data.data || []);
      setHistoryTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Impossible de charger l’historique des imports.');
    } finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(historyPage); }, [historyPage, fetchHistory]);

  const handleFileSelect = (files: File[]) => {
    if (!files.length) return;
    const selected = files[0];
    const validMimeTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validMimeTypes.includes(selected.type) && !selected.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Veuillez sélectionner un fichier Excel valide (.xlsx ou .xls).');
      return;
    }
    setFile(selected);
    setImportResult(null);
    setExpandedErrors(false);
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setStep('importing');
    setImportProgress(15);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<{ success: boolean; data: ImportResult; message: string }>('/imports/students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportProgress(100);
      setImportResult(data.data);
      setStep('result');
      await fetchHistory(1);
      setHistoryPage(1);
      if (data.data.failCount === 0) toast.success(`${data.data.successCount} élève(s) importé(s) avec succès.`);
      else toast.success(`${data.data.successCount} importé(s), ${data.data.failCount} ligne(s) en échec.`);
    } catch (error) {
      setStep('upload');
      setImportProgress(0);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l’import du fichier Excel.');
    } finally { setUploading(false); }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    setImportProgress(0);
    setExpandedErrors(false);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(Array.from(e.dataTransfer.files));
  };

  const parseErrors = (record: ImportRecord) => {
    if (!record.error_log) return [];
    if (Array.isArray(record.error_log)) return record.error_log;
    try { return JSON.parse(record.error_log) as { row: number; message: string }[]; } catch { return []; }
  };

  const getStatusBadge = (status: string) => status === 'completed'
    ? <Badge variant="success">Terminé</Badge>
    : status === 'processing'
      ? <Badge variant="info">En cours</Badge>
      : status === 'failed'
        ? <Badge variant="danger">Échoué</Badge>
        : <Badge variant="warning">En attente</Badge>;

  const historyColumns: Column<ImportRecord>[] = [
    { key: 'filename', header: 'Fichier', render: r => <div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-emerald-600" /><span className="font-medium text-slate-900">{r.filename}</span></div> },
    { key: 'total_rows', header: 'Lignes', render: r => <span className="text-slate-700">{r.total_rows}</span> },
    { key: 'imported_rows', header: 'Importées', render: r => <span className={cn('font-medium', r.imported_rows > 0 ? 'text-emerald-700' : 'text-slate-400')}>{r.imported_rows}</span> },
    { key: 'failed_rows', header: 'Échouées', render: r => <span className={cn('font-medium', r.failed_rows > 0 ? 'text-red-700' : 'text-slate-400')}>{r.failed_rows}</span> },
    { key: 'status', header: 'Statut', render: r => getStatusBadge(r.status) },
    { key: 'created_at', header: 'Date', render: r => <span className="text-xs text-muted">{formatDateTime(r.created_at)}</span> },
  ];

  const steps: Step[] = ['upload', 'importing', 'result'];
  const stepIndex = steps.indexOf(step);

  return <div className="space-y-5">
    <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Données</p><h1 className="text-xl font-semibold tracking-tight text-slate-900">Import des élèves</h1><p className="mt-1 text-sm text-muted">Importez rapidement une liste d’élèves depuis un fichier Excel.</p></div>
    </header>

    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-3 py-3 shadow-sm">
      {steps.map((s, i) => <div key={s} className="flex items-center gap-2"><div className={cn('flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold', step === s ? 'bg-primary text-white' : i < stepIndex ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400')}>{i < stepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}</div><span className={cn('text-xs font-medium', step === s ? 'text-slate-900' : 'text-slate-400')}>{s === 'upload' ? 'Fichier' : s === 'importing' ? 'Import' : 'Résultat'}</span>{i < steps.length - 1 && <div className="h-px w-6 bg-line sm:w-10" />}</div>)}
    </div>

    {step === 'upload' && <Card>
      <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-surface px-5 py-12 text-center transition hover:border-primary-300 focus-within:border-primary-300">
        <div className="mb-4 rounded-lg bg-primary-50 p-3"><Upload className="h-7 w-7 text-primary" /></div>
        <p className="text-sm font-semibold text-slate-900">Cliquez ou glissez votre fichier ici</p>
        <p className="mt-1 text-xs text-muted">Excel uniquement : .xlsx ou .xls</p>
        {file && <div className="mt-4 flex max-w-full items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2"><FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-700" /><span className="truncate text-xs font-medium text-emerald-800">{file.name}</span></div>}
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={e => e.target.files && handleFileSelect(Array.from(e.target.files))} className="hidden" />
      </div>
      <div className="mt-4 flex justify-end"><Button onClick={handleImport} loading={uploading} disabled={!file}><Upload className="h-4 w-4" /> Importer les élèves</Button></div>
      <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800"><p className="font-semibold">Format attendu</p><p className="mt-1">Colonnes obligatoires : <strong>Nom</strong>, <strong>Prénom</strong>, <strong>Matricule</strong>, <strong>Classe</strong>. Colonnes facultatives : <strong>Tél Parent 1</strong>, <strong>Tél Parent 2</strong>.</p></div>
    </Card>}

    {step === 'importing' && <Card><div className="flex flex-col items-center py-10 text-center"><div className="mb-4 rounded-lg bg-primary-50 p-3"><Clock className="h-7 w-7 animate-pulse text-primary" /></div><h3 className="text-base font-semibold text-slate-900">Import en cours...</h3><p className="mt-1 text-xs text-muted">Le fichier est traité et les élèves sont créés dans votre établissement.</p><div className="mt-5 w-full max-w-md"><ProgressBar value={importProgress} color="blue" label="Progression" /></div></div></Card>}

    {step === 'result' && importResult && <div className="space-y-4"><Card><h3 className="text-base font-semibold text-slate-900">Résumé de l’import</h3><p className="mt-1 text-xs text-muted">Fichier : {file?.name} · {importResult.totalRows} ligne(s)</p><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-md border border-line bg-surface p-4"><p className="text-2xl font-semibold tracking-tight text-slate-900">{importResult.totalRows}</p><p className="mt-1 text-xs font-medium text-muted">Total</p></div><div className="rounded-md border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-700" /><p className="text-2xl font-semibold tracking-tight text-emerald-800">{importResult.successCount}</p></div><p className="mt-1 text-xs font-medium text-emerald-700">Importées avec succès</p></div><div className="rounded-md border border-red-200 bg-red-50 p-4"><div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-700" /><p className="text-2xl font-semibold tracking-tight text-red-800">{importResult.failCount}</p></div><p className="mt-1 text-xs font-medium text-red-700">Échouées</p></div></div>{importResult.errors.length > 0 && <div className="mt-5"><button onClick={() => setExpandedErrors(!expandedErrors)} className="flex items-center gap-2 text-xs font-semibold text-red-700">{expandedErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Détails des erreurs ({importResult.errors.length})</button>{expandedErrors && <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-red-200 bg-red-50"><table className="w-full"><tbody>{importResult.errors.map((err, i) => <tr key={i} className="border-b border-red-100 last:border-0"><td className="px-3 py-2 text-xs font-medium text-red-800">Ligne {err.row}</td><td className="px-3 py-2 text-xs text-red-700">{err.message}</td></tr>)}</tbody></table></div>}</div>}</Card><div><Button variant="ghost" onClick={handleReset}><RotateCcw className="h-4 w-4" /> Nouvel import</Button></div></div>}

    <Card title="Historique des imports">{historyLoading ? <LoadingSpinner /> : historyError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"><p>Impossible de charger l’historique. {historyError}</p><div className="mt-2"><Button variant="ghost" onClick={() => fetchHistory(historyPage)}>Réessayer</Button></div></div> : importHistory.length === 0 ? <EmptyState icon={<FileSpreadsheet className="h-7 w-7" />} title="Aucun import" description="Les imports effectués apparaîtront ici." /> : <><div className="overflow-x-auto"><Table columns={historyColumns} data={importHistory} keyExtractor={r => String(r.id)} /></div><div className="mt-3"><Pagination page={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} /></div></>}</Card>
  </div>;
}
