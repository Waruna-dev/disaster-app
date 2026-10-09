import { useEffect, useMemo, useState } from 'react';
import { useReports } from './useReports';
import { buildFloodIncidents } from '../utils/floodIncidents';
import { subscribeFloodIncidentReviews } from '../services/floodIncidentReviewService';
import { FloodIncident, FloodIncidentReview, IncidentReviewStatus } from '../types/floodIncident';

export interface FloodIncidentWithReview extends FloodIncident {
  reviewStatus: IncidentReviewStatus;
  review: FloodIncidentReview | null;
}

/**
 * Verified flood reports -> 300m auto-clustering (utils/floodIncidents.ts) -> each
 * cluster merged with its officer review decision, if any (floodIncidentReviews
 * collection). A cluster with no review doc is 'Pending' — the officer hasn't
 * approved or rejected the auto-generated affected area yet.
 */
export function useFloodIncidents() {
  const { reports, loading: reportsLoading } = useReports('Verified');
  const [reviews, setReviews] = useState<Record<string, FloodIncidentReview>>({});
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeFloodIncidentReviews(
      (next) => {
        setReviews(next);
        setReviewsLoading(false);
      },
      () => setReviewsLoading(false)
    );
    return unsubscribe;
  }, []);

  const incidents = useMemo<FloodIncidentWithReview[]>(() => {
    const clusters = buildFloodIncidents(reports);
    return clusters.map((incident) => {
      const review = reviews[incident.id] ?? null;
      return { ...incident, review, reviewStatus: review?.status ?? 'Pending' };
    });
  }, [reports, reviews]);

  return { incidents, loading: reportsLoading || reviewsLoading };
}
