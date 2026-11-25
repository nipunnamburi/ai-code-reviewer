import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

// Yjs CRDT Document for persistence
export const ydoc = new Y.Doc();
export const yprovider = new IndexeddbPersistence('ai-code-reviewer-history-v3', ydoc);
export const yReviewsArray = ydoc.getArray('reviews');
export const yStagedAnnotations = ydoc.getMap('staged_annotations');

export function saveReviewToHistory(report) {
  if (!report) return;
  const item = {
    ...report,
    saved_at: new Date().toISOString(),
    id: 'rev_' + Date.now()
  };
  ydoc.transact(() => {
    // Keep max 20 reviews in history
    yReviewsArray.insert(0, [item]);
    if (yReviewsArray.length > 20) {
      yReviewsArray.delete(20, yReviewsArray.length - 20);
    }
  });
}
