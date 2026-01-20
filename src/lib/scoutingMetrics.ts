/**
 * Unified metrics extraction for scouting sessions.
 * Ensures consistent values across Resumen, Actividad, and Métricas tabs.
 */

export interface ScoutingSessionData {
  technologies_found?: number | null;
  technologies_approved?: number | null;
  technologies_discarded?: number | null;
  sites_examined?: number | null;
  summary?: unknown;
}

export interface ExtractedMetrics {
  technologiesFound: number;
  sitesExamined: number;
  technologiesDiscarded: number;
  technologiesApproved: number;
  duplicatesSkipped: number;
  errorsCount: number;
  /** True if technologiesFound came from realTechCount (verified DB count) */
  isVerifiedCount: boolean;
}

/**
 * Extracts metrics from a scouting session with consistent priority:
 * 1. realTechCount (actual DB count) - highest priority for technologies
 * 2. session.summary (final values from Railway)
 * 3. session fields (updated during execution via webhooks)
 */
export function extractSessionMetrics(
  session: ScoutingSessionData,
  realTechCount?: number
): ExtractedMetrics {
  const summary = session.summary as Record<string, unknown> | null;

  // Track if we're using the verified count
  const isVerifiedCount = realTechCount !== undefined;

  // Technologies: prioritize realTechCount > summary > session
  const technologiesFound =
    realTechCount ??
    (summary?.technologies_inserted as number) ??
    (summary?.technologies_found as number) ??
    session.technologies_found ??
    0;

  // Sites: prioritize summary > session
  const sitesExamined =
    (summary?.sites_visited as number) ??
    (summary?.sources_analyzed as number) ??
    session.sites_examined ??
    0;

  // Discarded and approved: use session directly
  const technologiesDiscarded = session.technologies_discarded ?? 0;
  const technologiesApproved = session.technologies_approved ?? 0;

  // Duplicates and errors: only available in summary
  const duplicatesSkipped =
    (summary?.duplicates_skipped as number) ??
    (summary?.duplicates as number) ??
    0;

  const errorsCount =
    (summary?.errors as number) ?? (summary?.errors_count as number) ?? 0;

  return {
    technologiesFound,
    sitesExamined,
    technologiesDiscarded,
    technologiesApproved,
    duplicatesSkipped,
    errorsCount,
    isVerifiedCount,
  };
}
