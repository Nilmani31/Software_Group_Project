/**
 * Helper function to generate a MongoDB query filter based on user role and assigned branches.
 * @param {Object} req - The Express request object containing headers
 * @returns {Object} MongoDB query filter for branchId
 */
const getBranchFilter = (req) => {
  const roleId = req.headers['x-user-role'];
  const branchId = req.headers['x-user-branch'];
  
  let allowedBranches = [];
  try {
    const rawAllowed = req.headers['x-allowed-branches'];
    if (rawAllowed) {
      allowedBranches = JSON.parse(rawAllowed);
    }
  } catch (e) {
    console.warn('Failed to parse x-allowed-branches header:', e.message);
  }

  // Admin and Director can see all branches
  if (roleId === 'ROLE_ADMIN' || roleId === 'ROLE_DIRECTOR' || roleId === 'ADMIN' || roleId === 'DIRECTOR') {
    return {}; // No filter, return all records
  }

  // Manager can see branches they are allowed to access
  if (roleId === 'ROLE_MANAGER' || roleId === 'MANAGER') {
    if (allowedBranches.length > 0) {
      return { branchId: { $in: allowedBranches } };
    }
    // Fallback to their primary branch if allowedBranches is empty
    return branchId ? { branchId } : {};
  }

  // Branch Manager and Staff can only see their own branch
  if (roleId === 'ROLE_BRANCH_MANAGER' || roleId === 'BRANCH_MANAGER' || roleId === 'ROLE_STAFF' || roleId === 'STAFF') {
    return branchId ? { branchId } : {};
  }

// If no role is provided (or unrecognized), fallback to primary branch or strict block
  // Default to only their branch to be safe, or return an impossible condition to block
  return branchId ? { branchId } : { branchId: '000000000000000000000000' };
};

/**
 * Helper function for Issue Notes which have fromBranchId and toBranchId
 */
const getIssueNoteBranchFilter = (req) => {
  const roleId = req.headers['x-user-role'];
  const branchId = req.headers['x-user-branch'];
  
  let allowedBranches = [];
  try {
    const rawAllowed = req.headers['x-allowed-branches'];
    if (rawAllowed) {
      allowedBranches = JSON.parse(rawAllowed);
    }
  } catch (e) {}

  if (roleId === 'ROLE_ADMIN' || roleId === 'ROLE_DIRECTOR' || roleId === 'ADMIN' || roleId === 'DIRECTOR') {
    return {};
  }

  if (roleId === 'ROLE_MANAGER' || roleId === 'MANAGER') {
    const branches = allowedBranches.length > 0 ? allowedBranches : (branchId ? [branchId] : []);
    if (branches.length === 0) return { fromBranchId: '000000000000000000000000' };
    return {
      $or: [
        { fromBranchId: { $in: branches } },
        { toBranchId: { $in: branches } }
      ]
    };
  }

  // Branch Manager and Staff
  if (branchId) {
    return {
      $or: [
        { fromBranchId: branchId },
        { toBranchId: branchId }
      ]
    };
  }

  return { fromBranchId: '000000000000000000000000' };
};

module.exports = {
  getBranchFilter,
  getIssueNoteBranchFilter
};
