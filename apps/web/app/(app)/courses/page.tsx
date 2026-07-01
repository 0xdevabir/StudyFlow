import { ComingSoon } from '~/components/feedback/coming-soon';

export default function CoursesPage() {
  return (
    <ComingSoon
      title="Courses"
      description="Manage every learning you care about, with unlimited hierarchy."
      features={['Unlimited dynamic hierarchy', 'Templates & duplicate', 'Status, priority, color, icon', 'Progress rollups']}
    />
  );
}