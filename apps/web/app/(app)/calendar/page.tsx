import { ComingSoon } from '~/components/feedback/coming-soon';

export default function CalendarPage() {
  return (
    <ComingSoon
      title="Calendar"
      description="Deadlines, study sessions, exams, reminders — one cohesive calendar."
      features={['Month / week / day', 'Drag-and-drop reschedule', 'ICS export', 'Smart reminders']}
    />
  );
}