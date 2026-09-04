import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';

interface ConfirmDialogProps { open:boolean; title:string; message:string; onConfirm:()=>void; onCancel:()=>void; variant?:'danger'|'default'; loading?:boolean; confirmationPhrase?:string; }
export default function ConfirmDialog({open,title,message,onConfirm,onCancel,variant='default',loading,confirmationPhrase}:ConfirmDialogProps){
  const [value,setValue]=useState('');
  const close=()=>{setValue('');onCancel();};
  const confirmed=confirmationPhrase?value.trim().toUpperCase()===confirmationPhrase.toUpperCase():true;
  return <Modal open={open} onClose={close} title={title} size="sm"><div className="space-y-4"><p className="text-sm text-gray-600">{message}</p>{confirmationPhrase&&<Input label={`Tapez ${confirmationPhrase} pour confirmer`} value={value} onChange={e=>setValue(e.target.value)} autoFocus />}</div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={close} disabled={loading}>Annuler</Button><Button variant={variant==='danger'?'danger':'primary'} onClick={onConfirm} loading={loading} disabled={!confirmed}>{variant==='danger'?'Confirmer':'Confirmer'}</Button></div></Modal>;
}
