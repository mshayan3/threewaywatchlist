"use client";

import { useGroupDetail } from "@/lib/useGroupDetail";
import GroupView from "./GroupView";
import Spinner from "./Spinner";

// Data wrapper around GroupView. Given a group `code` it loads/keeps-fresh that
// group and renders the detail; `embedded` hides the back link for the desktop
// master-detail pane. `onExit` fires after a leave/delete; `onBack` powers the
// mobile back link. A null code renders the "nothing selected" placeholder.
export default function GroupDetail({
  code,
  embedded,
  onBack,
  onExit,
}: {
  code: string | null;
  embedded?: boolean;
  onBack?: () => void;
  onExit?: () => void;
}) {
  const g = useGroupDetail(code, onExit);

  if (!code) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-6 text-center text-faint">
        <div>
          <div className="font-display text-[17px] font-semibold text-text">Pick a group</div>
          <p className="m-0 mt-1 text-[14px]">Choose one on the left to see what you can watch together.</p>
        </div>
      </div>
    );
  }

  if (g.loading || g.resolving) return <Spinner />;

  if (!g.group) {
    return (
      <div className="grid min-h-[40vh] place-items-center px-6 text-center text-faint">
        <p className="m-0 text-[14px]">This group isn&apos;t available.</p>
      </div>
    );
  }

  return (
    <GroupView
      group={g.group}
      movies={g.movies}
      members={g.members}
      myUserId={g.user?.id}
      stale={g.stale}
      myWatchlistIds={g.personal.watchlistIds}
      myWatchedIds={g.personal.watchedIds}
      myWatchCounts={g.personal.watchCounts}
      embedded={embedded}
      onBack={onBack ?? (() => {})}
      onRetry={g.loadGroupMovies}
      onAddToMine={g.onAddToMine}
      onRemoveFromMine={g.onRemoveFromMine}
      onRemoveMember={g.onRemoveMember}
      onLeave={g.onLeave}
      onDelete={g.onDelete}
    />
  );
}
