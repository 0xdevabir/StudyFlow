import { ComingSoon } from '~/components/feedback/coming-soon';

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Profile, theme, language, timezone, notifications, study preferences."
      features={['Profile & avatar', 'Theme & accent color', 'Notification preferences', 'Data export & import']}
    />
  );
}