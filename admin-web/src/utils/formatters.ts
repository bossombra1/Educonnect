import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { MessagePriority, DeliveryStatus, UserRole } from '@/types';

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy', { locale: fr });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr });
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

export function formatPhone(phone?: string): string {
  if (!phone) return '—';
  if (phone.length >= 8) {
    return phone.slice(0, 4) + '****' + phone.slice(-2);
  }
  return phone;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function getPriorityColor(priority: MessagePriority): string {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-50';
    case 'important': return 'text-amber-600 bg-amber-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

export function getPriorityLabel(priority: MessagePriority): string {
  switch (priority) {
    case 'urgent': return 'Urgent';
    case 'important': return 'Important';
    default: return 'Normal';
  }
}

export function getDeliveryStatusColor(status: DeliveryStatus): string {
  switch (status) {
    case 'delivered': return 'text-emerald-600 bg-emerald-50';
    case 'failed': return 'text-red-600 bg-red-50';
    default: return 'text-amber-600 bg-amber-50';
  }
}

export function getDeliveryStatusLabel(status: DeliveryStatus): string {
  switch (status) {
    case 'delivered': return 'Livré';
    case 'failed': return 'Échoué';
    default: return 'En attente';
  }
}

export function getRoleBadge(role: UserRole): { label: string; className: string } {
  switch (role) {
    case 'ADMIN': return { label: 'Admin', className: 'bg-purple-100 text-purple-700' };
    case 'STAFF': return { label: 'Personnel', className: 'bg-blue-100 text-blue-700' };
    case 'TEACHER': return { label: 'Enseignant', className: 'bg-indigo-100 text-indigo-700' };
    case 'PARENT': return { label: 'Parent', className: 'bg-emerald-100 text-emerald-700' };
    case 'STUDENT': return { label: 'Élève', className: 'bg-amber-100 text-amber-700' };
    default: return { label: role, className: 'bg-gray-100 text-gray-700' };
  }
}
