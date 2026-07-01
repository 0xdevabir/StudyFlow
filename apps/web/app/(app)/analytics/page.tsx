import { ComingSoon } from '~/components/feedback/coming-soon';

export default function AnalyticsPage() {
  return (
    <ComingSoon
      title="Analytics"
      description="Beautiful charts of your study hours, completion, and weekly trends."
      features={['Recharts visualisations', 'Weekly / monthly / yearly', 'Time-by-course', 'Heatmap calendar']}
    />
  );
}