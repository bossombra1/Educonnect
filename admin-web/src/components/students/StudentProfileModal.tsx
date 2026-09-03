import { Printer, X } from 'lucide-react';
import Button from '@/components/ui/Button';

export interface StudentProfileData {
  id: string | number;
  first_name: string;
  last_name: string;
  matricule: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: number | boolean;
  created_at: string | null;
  updated_at: string | null;
  student_id: string | number;
  matricule_scolaire: string | null;
  admission_date: string | null;
  student_status: 'active' | 'transferred' | 'graduated' | 'suspended' | string;
  class_id: string | number;
  class_name: string;
  class_level: string | null;
  class_section: string | null;
  school_year: string | null;
  establishment_id: string | number;
  establishment_name: string;
  establishment_slug: string;
  establishment_logo_url: string | null;
  establishment_address: string | null;
  establishment_phone: string | null;
  establishment_email: string | null;
  parents: Array<{
    id: string | number;
    first_name: string;
    last_name: string;
    matricule: string | null;
    email: string | null;
    phone: string | null;
    profession: string | null;
    is_primary_contact: number | boolean;
    priority: 'parent1' | 'parent2' | string;
    is_emergency_contact: number | boolean;
  }>;
}

interface Props { profile: StudentProfileData | null; onClose: () => void; }

const MINISTRY_EMBLEM = 'https://www.education.gouv.ci/assets/image/General/armoiries.jpg';

function assetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
}

function dateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
}

function statusLabel(value: string): string {
  return ({ active: 'Actif', transferred: 'Transféré', graduated: 'Diplômé', suspended: 'Suspendu' } as Record<string, string>)[value] || value || '—';
}

export default function StudentProfileModal({ profile, onClose }: Props) {
  if (!profile) return null;
  const avatar = assetUrl(profile.avatar_url);
  const schoolLogo = assetUrl(profile.establishment_logo_url);
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  const printProfile = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=900');
    if (!printWindow) return;
    const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
    const image = avatar ? `<img class="avatar" src="${esc(avatar)}" alt="Avatar" />` : `<div class="avatar initials">${esc(`${profile.first_name[0] || ''}${profile.last_name[0] || ''}`)}</div>`;
    const school = schoolLogo ? `<img class="school-logo" src="${esc(schoolLogo)}" alt="Logo établissement" />` : '';
    const parents = profile.parents.length ? profile.parents.map((parent) => `<div class="parent"><b>${esc(`${parent.first_name} ${parent.last_name}`)}</b><span>${esc(parent.priority === 'parent2' ? 'Responsable 2' : 'Responsable 1')}${parent.is_emergency_contact ? ' · Contact d’urgence' : ''}</span><span>${esc(parent.phone || parent.email || '—')}</span></div>`).join('') : '<div class="muted">Aucun responsable associé.</div>';
    printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fiche élève - ${esc(fullName)}</title><style>
      *{box-sizing:border-box}body{margin:0;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#172033;background:#fff}.sheet{max-width:900px;margin:auto;border:1px solid #d9dee8;border-radius:18px;overflow:hidden}.header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 26px;border-bottom:3px solid #2e7d32}.ministry{display:flex;align-items:center;gap:14px}.ministry img{width:72px;height:72px;object-fit:contain}.ministry h1{font-size:16px;margin:0 0 4px}.ministry p{font-size:11px;margin:0;color:#657085}.school{text-align:right}.school-logo{width:64px;height:64px;object-fit:contain;display:block;margin-left:auto;margin-bottom:5px}.school-name{font-size:15px;font-weight:700}.school-info{font-size:10px;color:#657085;line-height:1.5}.title{padding:16px 26px;text-align:center;background:#f6f8f6}.title h2{font-size:19px;margin:0 0 4px}.title p{margin:0;font-size:11px;color:#657085}.identity{display:flex;gap:24px;padding:26px}.avatar{width:150px;height:180px;border-radius:12px;object-fit:cover;border:1px solid #d9dee8;background:#f2f4f7}.initials{display:flex;align-items:center;justify-content:center;font-size:42px;font-weight:700;color:#2e7d32}.name{font-size:25px;font-weight:700;margin:8px 0}.badge{display:inline-block;padding:5px 9px;border-radius:999px;background:#e9f6ea;color:#216526;font-size:11px;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px}.item{padding:9px 0;border-bottom:1px solid #edf0f4}.label{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#7a8495}.value{font-size:12px;margin-top:3px}.section{margin:0 26px 22px;border-top:1px solid #e5e9ef;padding-top:15px}.section h3{font-size:13px;margin:0 0 10px}.parents{display:grid;grid-template-columns:1fr 1fr;gap:10px}.parent{border:1px solid #e1e5eb;border-radius:9px;padding:10px;font-size:11px}.parent span{display:block;color:#687386;margin-top:3px}.footer{padding:14px 26px;background:#fafbfc;border-top:1px solid #e5e9ef;font-size:9px;color:#7a8495;display:flex;justify-content:space-between}@media print{body{padding:0}.sheet{border:0;border-radius:0;max-width:none}}
    </style></head><body><main class="sheet"><header class="header"><div class="ministry"><img src="${MINISTRY_EMBLEM}" alt="Armoiries officielles de la Côte d'Ivoire"><div><h1>RÉPUBLIQUE DE CÔTE D'IVOIRE</h1><p>Ministère de l'Éducation Nationale et de l'Alphabétisation</p></div></div><div class="school">${school}<div class="school-name">${esc(profile.establishment_name)}</div><div class="school-info">${esc(profile.establishment_address || '')}<br>${esc(profile.establishment_phone || profile.establishment_email || '')}</div></div></header><section class="title"><h2>FICHE INDIVIDUELLE DE L'ÉLÈVE</h2><p>Document généré depuis EduConnect</p></section><section class="identity">${image}<div style="flex:1"><div class="label">Nom complet</div><div class="name">${esc(fullName)}</div><span class="badge">${esc(statusLabel(profile.student_status))}</span><div class="grid" style="margin-top:18px"><div class="item"><div class="label">Matricule scolaire</div><div class="value">${esc(profile.matricule_scolaire || profile.matricule || '—')}</div></div><div class="item"><div class="label">Classe</div><div class="value">${esc(profile.class_name)}</div></div><div class="item"><div class="label">Niveau</div><div class="value">${esc(profile.class_level || '—')}</div></div><div class="item"><div class="label">Section</div><div class="value">${esc(profile.class_section || '—')}</div></div><div class="item"><div class="label">Année scolaire</div><div class="value">${esc(profile.school_year || '—')}</div></div><div class="item"><div class="label">Date d'admission</div><div class="value">${esc(dateOnly(profile.admission_date))}</div></div></div></div></section><section class="section"><h3>Informations de contact</h3><div class="grid"><div class="item"><div class="label">E-mail</div><div class="value">${esc(profile.email || '—')}</div></div><div class="item"><div class="label">Téléphone</div><div class="value">${esc(profile.phone || '—')}</div></div><div class="item"><div class="label">Identifiant EduConnect</div><div class="value">${esc(profile.matricule || '—')}</div></div><div class="item"><div class="label">Date d'inscription dans l'application</div><div class="value">${esc(dateOnly(profile.created_at))}</div></div></div></section><section class="section"><h3>Parents / responsables associés</h3><div class="parents">${parents}</div></section><footer class="footer"><span>Établissement : ${esc(profile.establishment_name)}</span><span>EduConnect · Fiche élève</span></footer></main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));window.addEventListener('afterprint',()=>window.close());</script></body></html>`);
    printWindow.document.close();
  };

  return <>
    <style>{`@media print { body > * { display:none !important; } #student-profile-print { display:block !important; position:static !important; } #student-profile-print .no-print { display:none !important; } }`}</style>
    <div id="student-profile-print" className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 print:static print:bg-white print:p-0">
      <div className="mx-auto my-6 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl print:my-0 print:max-w-none print:rounded-none print:shadow-none">
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div><p className="text-sm font-semibold text-slate-900">Fiche de {fullName}</p><p className="text-xs text-slate-500">Aperçu avant impression</p></div>
          <div className="flex items-center gap-2"><Button variant="secondary" size="sm" onClick={onClose}><X className="h-4 w-4"/>Fermer</Button><Button size="sm" onClick={printProfile}><Printer className="h-4 w-4"/>Imprimer</Button></div>
        </div>
        <div className="p-6 print:p-0">
          <div className="flex flex-col gap-5 border-b-2 border-primary pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><img src={MINISTRY_EMBLEM} alt="Armoiries officielles de la Côte d'Ivoire" className="h-16 w-16 object-contain"/><div><p className="text-xs font-bold uppercase tracking-wide text-slate-800">République de Côte d'Ivoire</p><p className="mt-1 text-xs text-slate-500">Ministère de l'Éducation Nationale et de l'Alphabétisation</p></div></div>
            <div className="text-right">{schoolLogo&&<img src={schoolLogo} alt="Logo de l'établissement" className="ml-auto mb-1 h-14 w-14 object-contain"/>}<p className="text-sm font-bold text-slate-900">{profile.establishment_name}</p><p className="text-[10px] leading-4 text-slate-500">{profile.establishment_address||''}{profile.establishment_phone?` · ${profile.establishment_phone}`:''}</p></div>
          </div>
          <div className="py-5 text-center"><h2 className="text-lg font-bold tracking-wide text-slate-900">FICHE INDIVIDUELLE DE L'ÉLÈVE</h2><p className="mt-1 text-xs text-slate-500">Document généré depuis EduConnect</p></div>
          <div className="grid gap-6 md:grid-cols-[150px_1fr]">
            <div>{avatar?<img src={avatar} alt={`Avatar de ${fullName}`} className="h-44 w-36 rounded-xl border border-slate-200 object-cover"/>:<div className="flex h-44 w-36 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-3xl font-bold text-primary">{profile.first_name[0]}{profile.last_name[0]}</div>}</div>
            <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Nom complet</p><p className="mt-1 text-2xl font-bold text-slate-900">{fullName}</p><span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{statusLabel(profile.student_status)}</span><div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{[
              ['Matricule scolaire',profile.matricule_scolaire||profile.matricule],['Classe',profile.class_name],['Niveau',profile.class_level],['Section',profile.class_section],['Année scolaire',profile.school_year],['Date d’admission',dateOnly(profile.admission_date)],
            ].map(([label,value])=><div key={label} className="border-b border-slate-100 pb-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xs font-medium text-slate-800">{value||'—'}</p></div>)}</div></div>
          </div>
          <div className="mt-6 border-t border-slate-200 pt-4"><h3 className="text-sm font-semibold text-slate-900">Informations de contact</h3><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{[
            ['E-mail',profile.email],['Téléphone',profile.phone],['Identifiant EduConnect',profile.matricule],['Inscrit dans l’application',dateOnly(profile.created_at)],
          ].map(([label,value])=><div key={label} className="border-b border-slate-100 pb-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xs text-slate-800">{value||'—'}</p></div>)}</div></div>
          <div className="mt-6 border-t border-slate-200 pt-4"><h3 className="text-sm font-semibold text-slate-900">Parents / responsables associés</h3>{profile.parents.length===0?<p className="mt-3 text-xs text-slate-400">Aucun responsable associé.</p>:<div className="mt-3 grid gap-3 sm:grid-cols-2">{profile.parents.map((parent)=><div key={`${parent.id}-${parent.priority}`} className="rounded-lg border border-slate-200 p-3"><p className="text-xs font-semibold text-slate-900">{parent.first_name} {parent.last_name}</p><p className="mt-1 text-[11px] text-slate-500">{parent.priority==='parent2'?'Responsable 2':'Responsable 1'}{parent.is_emergency_contact?' · Contact d’urgence':''}</p><p className="mt-2 text-[11px] text-slate-600">{parent.phone||parent.email||'—'}</p>{parent.profession&&<p className="mt-1 text-[11px] text-slate-500">{parent.profession}</p>}</div>)}</div>}</div>
          <div className="mt-6 flex justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400"><span>{profile.establishment_name}</span><span>EduConnect · Fiche élève</span></div>
        </div>
      </div>
    </div>
  </>;
}
