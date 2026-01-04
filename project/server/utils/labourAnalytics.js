// =================================================================
//  LABOUR ANALYTICS UTILITY FUNCTIONS
// =================================================================

/**
 * Calculates the total cost per project based on time entries and laborer rates.
 * Assumes an 8-hour workday for cost calculation.
 * @param {Array<Object>} entries - Raw rows from the "time_entries" table.
 * @param {Array<Object>} laborers - Raw rows from the "laborers" table.
 * @returns {Array<Object>} An array of objects, e.g., [{ project_id: 1, cost: 5000 }, { project_id: 2, cost: 7500 }]
 */
export const aggregateTimeEntriesByProject = (entries, laborers) => {
  const rateMap = new Map();
  laborers.forEach(l => {
    rateMap.set(Number(l.id), parseFloat(l.daily_rate) || 0);
  });

  const projectCosts = {};

  entries.forEach(entry => {
    const dailyRate = rateMap.get(Number(entry.laborer_id));
    if (dailyRate === undefined) return;

    const hours = parseFloat(entry.hours_worked) || 0;
    const costForEntry = (dailyRate / 8) * hours;

    if (projectCosts[entry.project_id]) {
      projectCosts[entry.project_id] += costForEntry;
    } else {
      projectCosts[entry.project_id] = costForEntry;
    }
  });

  return Object.keys(projectCosts).map(projectId => ({
    name: `Project ${projectId}`,
    project_id: parseInt(projectId),
    cost: Math.round(projectCosts[projectId])
  }));
};

/**
 * Calculates the total estimated daily cost for each skill set.
 * (This function is working correctly and remains unchanged.)
 * @param {Array<Object>} laborers - Raw rows from the "laborers" table.
 * @returns {Array<Object>} An array of objects, e.g., [{ name: 'Mason', cost: 12000 }, { name: 'Carpenter', cost: 9500 }]
 */
export const aggregateLaborersBySkillCost = (laborers) => {
  const skillCosts = {};

  laborers.forEach(laborer => {
    const skill = laborer.skill_set || 'Unskilled';
    const rate = parseFloat(laborer.daily_rate) || 0;

    if (skillCosts[skill]) {
      skillCosts[skill] += rate;
    } else {
      skillCosts[skill] = rate;
    }
  });

  return Object.keys(skillCosts).map(skill => ({
    name: skill,
    cost: skillCosts[skill]
  }));
};

/**
 * Counts the number of laborers in each status category.
 * (This function is working correctly and remains unchanged.)
 * @param {Array<Object>} laborers - Raw rows from the "laborers" table.
 * @returns {Array<Object>} An array of objects for the Donut Chart, e.g., [{ name: 'Available', value: 10 }, { name: 'Assigned', value: 25 }]
 */
export const getLaborerStatusCounts = (laborers) => {
  const statusCounts = {
    'Available': 0,
    'Assigned': 0,
    'On Leave': 0,
    'Inactive': 0
  };

  laborers.forEach(laborer => {
    const status = laborer.current_status;
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++;
    }
  });

  return Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status]
  }));
};

