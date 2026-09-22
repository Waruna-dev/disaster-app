import { useEffect, useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useReports } from './useReports';
import { buildFloodIncidents } from '../utils/floodIncidents';
import { subscribeFloodIncidentReviews } from '../services/floodIncidentReviewService';
import { FloodIncident, FloodIncidentReview, IncidentReviewStatus } from '../types/floodIncident';
import { Report } from '../types/report';

export interface FloodIncidentWithReview extends FloodIncident {
  reviewStatus: IncidentReviewStatus;
  review: FloodIncidentReview | null;
}

// TEMP: five demo verified flood reports around Negombo, each within ~260m of its
// neighbors so they cluster into one incident — lets the polygon/dot-boundary map
// and the approve/reject flow be seen end-to-end before real reports form a 300m
// cluster on their own. Same idea as app/(DMC)/map.tsx's SAMPLE_PINS. Remove once
// real verified flood reports reliably cluster in production.
const SAMPLE_FLOOD_REPORTS: Report[] = [
  {
    id: 'sample-flood-1',
    userId: 'sample',
    disasterType: 'flood',
    affectedArea: 'Negombo',
    location: { latitude: 7.210276, longitude: 79.8358 },
    description: 'Water rising along the main road, ankle-deep near the junction.',
    status: 'Verified',
    referenceNumber: 'REP-90001',
    createdAt: Timestamp.fromDate(new Date('2025-09-22T13:50:00')),
  },
  {
    id: 'sample-flood-2',
    userId: 'sample',
    disasterType: 'flood',
    affectedArea: 'Negombo',
    location: { latitude: 7.208911, longitude: 79.837694 },
    description: 'Water entering ground-floor houses on the lane behind the school.',
    status: 'Verified',
    referenceNumber: 'REP-90002',
    createdAt: Timestamp.fromDate(new Date('2025-09-22T14:00:00')),
  },
  {
    id: 'sample-flood-3',
    userId: 'sample',
    disasterType: 'flood',
    affectedArea: 'Negombo',
    location: { latitude: 7.206701, longitude: 79.836971 },
    description: 'Canal has overflowed onto the access road, vehicles unable to pass.',
    status: 'Verified',
    referenceNumber: 'REP-90003',
    createdAt: Timestamp.fromDate(new Date('2025-09-22T14:10:00')),
  },
  {
    id: 'sample-flood-4',
    userId: 'sample',
    disasterType: 'flood',
    affectedArea: 'Negombo',
    location: { latitude: 7.206701, longitude: 79.834629 },
    description: 'Backyard and well fully submerged, water still rising.',
    status: 'Verified',
    referenceNumber: 'REP-90004',
    createdAt: Timestamp.fromDate(new Date('2025-09-22T14:20:00')),
  },
  {
    id: 'sample-flood-5',
    userId: 'sample',
    disasterType: 'flood',
    affectedArea: 'Negombo',
    location: { latitude: 7.208911, longitude: 79.833906 },
    description: 'Shops along the market road flooded, residents evacuating on foot.',
    status: 'Verified',
    referenceNumber: 'REP-90005',
    createdAt: Timestamp.fromDate(new Date('2025-09-22T14:30:00')),
  },
];

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
    const clusters = buildFloodIncidents([...reports, ...SAMPLE_FLOOD_REPORTS]);
    return clusters.map((incident) => {
      const review = reviews[incident.id] ?? null;
      return { ...incident, review, reviewStatus: review?.status ?? 'Pending' };
    });
  }, [reports, reviews]);

  return { incidents, loading: reportsLoading || reviewsLoading };
}
