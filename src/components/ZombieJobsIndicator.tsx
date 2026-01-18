import React from 'react';

/**
 * ZombieJobsIndicator - DISABLED
 * 
 * This component was querying the scouting_sessions table which doesn't exist
 * in the external database, causing 404 errors.
 * 
 * The component is now disabled and returns null.
 * To re-enable, uncomment the code below once the scouting_sessions table exists.
 */
export const ZombieJobsIndicator: React.FC = () => {
  // scouting_sessions table doesn't exist in external DB - disabled to prevent 404 errors
  return null;
};
