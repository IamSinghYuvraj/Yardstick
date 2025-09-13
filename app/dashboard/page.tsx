import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { NotesManager } from '@/components/notes/NotesManager';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <NotesManager />
    </DashboardLayout>
  );
}