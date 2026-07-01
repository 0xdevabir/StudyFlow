import { ComingSoon } from '~/components/feedback/coming-soon';

export default function GoalsPage() {
  return (
    <ComingSoon
      title="Goals"
      description="Daily, weekly, and monthly study goals with metric-driven progress."
      features={['Minutes, tasks, lessons, pages', 'Period-based targets', 'Auto-rollups', 'Streak tracking']}
    />
  );
}