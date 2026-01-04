// =================================================================
//  PROJECT FINANCIALS UTILITY FUNCTIONS
// =================================================================

/**
 * Aggregates project costs by cost_type for a specific project.
 * @param {Array<Object>} costs - An array of cost objects from the project_costs table for a single project.
 * @returns {Array<Object>} An array of objects formatted for a pie chart, e.g., [{ name: 'Labor', value: 15000 }, { name: 'Material', value: 25000 }]
 */
export const aggregateCostsByType = (costs) => {
  const costBreakdown = costs.reduce((acc, cost) => {
    const type = cost.cost_type || 'Other';
    const amount = parseFloat(cost.amount) || 0;
    acc[type] = (acc[type] || 0) + amount;
    return acc;
  }, {});

  return Object.entries(costBreakdown).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));
};

/**
 * Calculates the total actual spending for each project.
 * @param {Array<Object>} costs - An array of all cost objects from the project_costs table.
 * @returns {Map<number, number>} A Map where the key is the project_id and the value is the total actual cost.
 */
export const calculateActualsByProject = (costs) => {
  return costs.reduce((acc, cost) => {
    const projectId = cost.project_id;
    const amount = parseFloat(cost.amount) || 0;
    acc.set(projectId, (acc.get(projectId) || 0) + amount);
    return acc;
  }, new Map());
};
