/**
 * Technology Action Permissions
 * 
 * Centralized logic for calculating which actions are available
 * based on source, user role, and workflow status.
 */

import type { TechMetadata, TechActions } from '@/types/unifiedTech';
import type { AppRole } from '@/types/database';

export interface PermissionContext {
  metadata: TechMetadata;
  userRole: AppRole | null;
  userId: string | null;
}

/**
 * Calculate available actions based on context
 */
export function calculateTechActions(context: PermissionContext): TechActions {
  const { metadata, userRole, userId } = context;
  
  const isAuthenticated = !!userId;
  const isInternal = userRole ? ['admin', 'supervisor', 'analyst'].includes(userRole) : false;
  const isSupervisorOrAdmin = userRole ? ['admin', 'supervisor'].includes(userRole) : false;
  const isAdmin = userRole === 'admin';
  
  // Base permissions - all false
  const base: TechActions = {
    canEdit: false,
    canSave: false,
    canEnrich: false,
    canDownload: false,
    canSendToApproval: false,
    canApproveToDatabase: false,
    canReject: false,
    canBackToReview: false,
    canSendToReview: false,
    canClaimReview: false,
    canCompleteReview: false,
    canReleaseReview: false,
    canSendReviewToApproval: false,
    canApproveReview: false,
    canBackToReviewDB: false,
    canSendToDB: false,
    canViewInDB: false,
    canSendToScouting: false,
    canAddToProject: false,
    canFavorite: false,
    canSeeInternalInfo: false,
    canSeeSpecifications: false,
  };
  
  // Apply context-specific rules
  switch (metadata.source) {
    case 'scouting':
      return applyScoutingRules(base, metadata, userRole, isSupervisorOrAdmin, isInternal);
    case 'database':
      return applyDatabaseRules(base, metadata, userRole, userId, isInternal, isSupervisorOrAdmin, isAuthenticated);
    case 'longlist':
    case 'extracted':
      return applyLonglistRules(base, metadata, isInternal);
    case 'case_study':
      return applyCaseStudyRules(base, metadata, isInternal);
    default:
      return base;
  }
}

/**
 * Rules for scouting queue items
 */
function applyScoutingRules(
  base: TechActions,
  metadata: TechMetadata,
  userRole: AppRole | null,
  isSupervisorOrAdmin: boolean,
  isInternal: boolean
): TechActions {
  const { queueStatus } = metadata;
  
  return {
    ...base,
    // Editing always allowed unless approved
    canEdit: queueStatus !== 'approved',
    canSave: queueStatus !== 'approved',
    
    // AI enrichment
    canEnrich: queueStatus !== 'approved' && isInternal,
    
    // Download
    canDownload: true,
    
    // Scouting workflow
    canSendToApproval: queueStatus === 'review' && isInternal,
    canApproveToDatabase: queueStatus === 'pending_approval' && isSupervisorOrAdmin,
    canReject: (queueStatus === 'review' && isInternal) || 
               (queueStatus === 'pending_approval' && isSupervisorOrAdmin),
    canBackToReview: queueStatus === 'pending_approval' && isSupervisorOrAdmin,
    
    // Visibility
    canSeeInternalInfo: isInternal,
    canSeeSpecifications: false,
  };
}

/**
 * Rules for main database technologies
 */
function applyDatabaseRules(
  base: TechActions,
  metadata: TechMetadata,
  userRole: AppRole | null,
  userId: string | null,
  isInternal: boolean,
  isSupervisorOrAdmin: boolean,
  isAuthenticated: boolean
): TechActions {
  const { reviewStatus, isCurrentReviewer } = metadata;
  
  return {
    ...base,
    // Editing - allow when in_review by current reviewer, or no review/completed
    canEdit: isInternal && (
      !reviewStatus || 
      reviewStatus === 'none' || 
      reviewStatus === 'completed' ||
      (reviewStatus === 'in_review' && !!isCurrentReviewer)
    ),
    canSave: isInternal && (
      !reviewStatus || 
      reviewStatus === 'none' || 
      reviewStatus === 'completed' ||
      (reviewStatus === 'in_review' && !!isCurrentReviewer)
    ),
    
    // AI & Export
    canEnrich: isInternal,
    canDownload: true,
    
    // DB Review workflow - claim/release
    canSendToReview: isInternal && (!reviewStatus || reviewStatus === 'none' || reviewStatus === 'completed'),
    canClaimReview: isInternal && reviewStatus === 'pending',
    canReleaseReview: !!isCurrentReviewer && reviewStatus === 'in_review',
    
    // NEW: Review approval workflow
    // Analyst can send to approval when in_review and is the reviewer
    canSendReviewToApproval: !!isCurrentReviewer && reviewStatus === 'in_review',
    // Admin/Supervisor can approve when pending_approval
    canApproveReview: isSupervisorOrAdmin && reviewStatus === 'pending_approval',
    // Admin/Supervisor can send back to review
    canBackToReviewDB: isSupervisorOrAdmin && reviewStatus === 'pending_approval',
    
    // User actions
    canAddToProject: isAuthenticated,
    canFavorite: isAuthenticated,
    
    // Visibility
    canSeeInternalInfo: isInternal,
    canSeeSpecifications: false,
  };
}

/**
 * Rules for study longlist items
 */
function applyLonglistRules(
  base: TechActions,
  metadata: TechMetadata,
  isInternal: boolean
): TechActions {
  const isLinked = !!metadata.isLinkedToDB;
  
  return {
    ...base,
    // Editing - always allowed, syncs to DB if linked
    canEdit: true,
    canSave: true,
    
    // AI & Export
    canEnrich: true,
    canDownload: true,
    
    // Linking
    canSendToDB: !isLinked,
    canViewInDB: isLinked,
    
    // Visibility
    canSeeInternalInfo: isInternal,
    canSeeSpecifications: false,
  };
}

/**
 * Rules for case study technologies
 */
function applyCaseStudyRules(
  base: TechActions,
  metadata: TechMetadata,
  isInternal: boolean
): TechActions {
  const isLinked = !!metadata.isLinkedToDB;
  const isInScouting = !!metadata.isInScoutingQueue;
  
  return {
    ...base,
    // View-only for linked, editing for unlinked
    canEdit: !isLinked,
    canSave: !isLinked,
    
    // AI & Export
    canEnrich: !isLinked && isInternal,
    canDownload: true,
    
    // Linking
    canSendToScouting: !isLinked && !isInScouting && isInternal,
    canViewInDB: isLinked,
    
    // Visibility
    canSeeInternalInfo: isInternal,
    canSeeSpecifications: true,
  };
}

/**
 * Get the default actions (all disabled)
 */
export function getDefaultActions(): TechActions {
  return {
    canEdit: false,
    canSave: false,
    canEnrich: false,
    canDownload: false,
    canSendToApproval: false,
    canApproveToDatabase: false,
    canReject: false,
    canBackToReview: false,
    canSendToReview: false,
    canClaimReview: false,
    canCompleteReview: false,
    canReleaseReview: false,
    canSendReviewToApproval: false,
    canApproveReview: false,
    canBackToReviewDB: false,
    canSendToDB: false,
    canViewInDB: false,
    canSendToScouting: false,
    canAddToProject: false,
    canFavorite: false,
    canSeeInternalInfo: false,
    canSeeSpecifications: false,
  };
}
