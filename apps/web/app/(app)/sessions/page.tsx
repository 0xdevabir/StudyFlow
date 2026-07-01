import { ComingSoon } from '~/components/feedback/coming-soon';

export default function SessionsPage() {
  return (
    <ComingSoon
      title="Study sessions"
      description="Track every focused hour, with notes, productivity, and focus scoring."
      features={['Pomodoro timer', 'Course & topic linkage', 'Daily / weekly / monthly rolls', 'Productivity scoring']}
    />
  );
}