import { ComingSoon } from '~/components/feedback/coming-soon';

export default function NotesPage() {
  return (
    <ComingSoon
      title="Notes"
      description="Markdown notes attached to courses, lessons, tasks, and sessions."
      features={['TipTap rich editor', 'Markdown shortcuts', 'Attach anywhere', 'Full-text search']}
    />
  );
}