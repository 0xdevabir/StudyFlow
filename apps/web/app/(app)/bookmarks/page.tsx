import { ComingSoon } from '~/components/feedback/coming-soon';

export default function BookmarksPage() {
  return (
    <ComingSoon
      title="Bookmarks"
      description="Save videos, articles, GitHub repos, PDFs — linked to your courses."
      features={['Link + file bookmarks', 'Auto-fetched thumbnails', 'Tag & search', 'Course context']}
    />
  );
}