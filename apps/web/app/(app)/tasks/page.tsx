import { ComingSoon } from '~/components/feedback/coming-soon';

export default function TasksPage() {
  return (
    <ComingSoon
      title="Tasks"
      description="Assignments, exams, quizzes, practice — all with priorities and recurring schedules."
      features={['List / board / calendar', 'Recurrence rules', 'Priority + due dates', 'Soft delete']}
    />
  );
}