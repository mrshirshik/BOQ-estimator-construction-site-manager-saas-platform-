// =================================================================
//  PROJECT ANALYTICS UTILITY FUNCTIONS
// =================================================================

/**
 * Calculates key performance indicators for the project dashboard from a list of projects.
 * @param {Array<Object>} projects - An array of project objects from the database.
 * @returns {Object} An object containing the calculated dashboard stats.
 */
export const calculateProjectStats = (projects) => {
  const activeStatuses = ['Planning', 'In Progress', 'On Hold'];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to the start of the day for accurate date comparison

  // Filter for active projects first, as this is the basis for most stats.
  const activeProjects = projects.filter(p => activeStatuses.includes(p.status));

  // 1. Calculate Total Budget Under Management (for active projects)
  const totalBudget = activeProjects.reduce((sum, p) => sum + parseFloat(p.budget || 0), 0);

  // 2. Count Overdue Projects (active projects whose end date is in the past)
  const projectsOverdue = activeProjects.filter(p => {
    if (!p.end_date) return false;
    const endDate = new Date(p.end_date);
    return endDate < today;
  }).length;

  // 3. Calculate Average Project Duration in days
  const validDurationProjects = projects.filter(p => p.start_date && p.end_date);
  const totalDuration = validDurationProjects.reduce((sum, p) => {
    const start = new Date(p.start_date).getTime();
    const end = new Date(p.end_date).getTime();
    const duration = (end - start) / (1000 * 60 * 60 * 24); // Duration in days
    return sum + duration;
  }, 0);
  
  const averageDuration = validDurationProjects.length > 0
    ? Math.round(totalDuration / validDurationProjects.length)
    : 0;

  return {
    activeProjects: activeProjects.length,
    totalBudget,
    projectsOverdue,
    averageDuration,
  };
};
