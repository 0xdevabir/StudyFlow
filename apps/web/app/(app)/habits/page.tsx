import { ComingSoon } from '~/components/feedback/coming-soon';

export default function HabitsPage() {
  return (
    <ComingSoon
      title="Habits"
      description="Build study, reading, coding, and prayer habits with streak tracking."
      features={['Daily / weekly / custom', 'Streak analytics', 'Heatmap visualisation', 'Quiet days']}
    />
  );
}