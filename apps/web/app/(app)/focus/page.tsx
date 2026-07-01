import { ComingSoon } from '~/components/feedback/coming-soon';

export default function FocusPage() {
  return (
    <ComingSoon
      title="Focus mode"
      description="Pomodoro, fullscreen, ambient sounds — the deep work layer."
      features={['Pomodoro 25/5', 'Fullscreen study', 'Ambient sounds', 'Auto-session logging']}
    />
  );
}