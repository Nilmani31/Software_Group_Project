const mongoose = require('mongoose');
const Branch = require('../models/branches');

// In-memory branch cache with TTL
let branchCache = [];
let cacheExpiry = 0;

/**
 * Fetch branches from DB with 30s cache
 */
const getBranches = async () => {
  const now = Date.now();
  if (branchCache.length > 0 && now < cacheExpiry) {
    return branchCache;
  }
  try {
    const list = await Branch.find({}).lean();
    if (list && list.length > 0) {
      branchCache = list;
      cacheExpiry = now + 30000;
    }
  } catch (err) {
    console.warn('⚠️ Could not refresh branch cache:', err.message);
  }
  return branchCache;
};

/**
 * Resolve user branches from request headers against DB branches
 * @param {Object} req - Express request
 * @returns {Promise<Object>} { isAdminOrDirector, objectIds, idStrings, branchNames, primaryBranchName }
 */
const resolveUserBranches = async (req) => {
  const roleId = req.headers['x-user-role'] || '';
  const branchHeader = req.headers['x-user-branch'] || '';
  const branchNameHeader = req.headers['x-user-branch-name'] || '';

  let allowedBranches = [];
  try {
    const rawAllowed = req.headers['x-allowed-branches'];
    if (rawAllowed) {
      allowedBranches = typeof rawAllowed === 'string' ? JSON.parse(rawAllowed) : rawAllowed;
    }
  } catch (e) {
    console.warn('Failed to parse x-allowed-branches:', e.message);
  }

  // Admin and Director have unrestricted access to all branches
  if (
    roleId === 'ROLE_ADMIN' ||
    roleId === 'ROLE_DIRECTOR' ||
    roleId === 'ADMIN' ||
    roleId === 'DIRECTOR'
  ) {
    return {
      isAdminOrDirector: true,
      objectIds: [],
      idStrings: [],
      branchNames: [],
      primaryBranchName: 'All Branches'
    };
  }

  const branches = await getBranches();

  // Collect target keys from branchHeader and allowedBranches
  let targetKeys = [];
  if (roleId === 'ROLE_MANAGER' || roleId === 'MANAGER') {
    if (Array.isArray(allowedBranches) && allowedBranches.length > 0) {
      targetKeys.push(...allowedBranches);
    }
    if (branchHeader && !targetKeys.includes(branchHeader)) {
      targetKeys.push(branchHeader);
    }
  } else {
    // Branch Manager or Staff - strictly assigned to their primary branch
    if (branchHeader) {
      targetKeys.push(branchHeader);
    }
  }

  const matchedBranches = branches.filter((b) => {
    const bIdStr = b._id ? b._id.toString() : '';
    const bBranchId = b.branchId ? b.branchId.toUpperCase() : '';
    const bName = b.branchName ? b.branchName.toLowerCase() : '';
    const bCode = b.branchCode ? b.branchCode.toUpperCase() : '';

    return targetKeys.some((key) => {
      if (!key) return false;
      const kStr = String(key).trim();
      const kUpper = kStr.toUpperCase();
      const kLower = kStr.toLowerCase();

      return (
        bIdStr === kStr ||
        bBranchId === kUpper ||
        bName === kLower ||
        bCode === kUpper ||
        (kUpper === 'MAIN_BRANCH' && bBranchId === 'MAIN_BRANCH') ||
        (kUpper === 'TRAINING_BAR' && bBranchId === 'TRAINING_BAR') ||
        (kUpper === 'TRAINING_CAFE' && bBranchId === 'TRAINING_CAFE')
      );
    });
  });

  const objectIds = [];
  const idStrings = [];
  const branchNames = [];

  matchedBranches.forEach((b) => {
    if (b._id) objectIds.push(b._id);
    if (b.branchId) idStrings.push(b.branchId);
    if (b.branchName) branchNames.push(b.branchName);
  });

  // If header has a branch name that wasn't matched, add it safely
  if (branchNameHeader && !branchNames.some((n) => n.toLowerCase() === branchNameHeader.toLowerCase())) {
    branchNames.push(branchNameHeader);
  }

  // Also include "Main Branch" if "Colombo Main Branch" is present for backwards compatibility
  if (branchNames.some((n) => n.toLowerCase().includes('colombo'))) {
    if (!branchNames.includes('Main Branch')) branchNames.push('Main Branch');
  }

  const primaryBranchName =
    branchNames[0] || branchNameHeader || (matchedBranches[0] ? matchedBranches[0].branchName : 'Unknown Branch');

  return {
    isAdminOrDirector: false,
    objectIds,
    idStrings,
    branchNames,
    primaryBranchName
  };
};

/**
 * Filter for Stock and collections storing branchId as ObjectId
 */
const getBranchFilter = async (req, fieldName = 'branchId') => {
  const info = await resolveUserBranches(req);
  if (info.isAdminOrDirector) {
    return {};
  }

  if (!info.objectIds || info.objectIds.length === 0) {
    return { [fieldName]: new mongoose.Types.ObjectId('000000000000000000000000') };
  }

  if (info.objectIds.length === 1) {
    return { [fieldName]: info.objectIds[0] };
  }

  return { [fieldName]: { $in: info.objectIds } };
};

/**
 * Filter for Issue Notes which have fromBranchId and toBranchId (ObjectIds)
 */
const getIssueNoteBranchFilter = async (req) => {
  const info = await resolveUserBranches(req);
  if (info.isAdminOrDirector) {
    return {};
  }

  if (!info.objectIds || info.objectIds.length === 0) {
    return { fromBranchId: new mongoose.Types.ObjectId('000000000000000000000000') };
  }

  return {
    $or: [
      { fromBranchId: { $in: info.objectIds } },
      { toBranchId: { $in: info.objectIds } }
    ]
  };
};

/**
 * Filter for Purchase Orders which store createdByBranch and branch as string names
 */
const getPOBranchFilter = async (req) => {
  const info = await resolveUserBranches(req);
  if (info.isAdminOrDirector) {
    return {};
  }

  if (!info.branchNames || info.branchNames.length === 0) {
    return { createdByBranch: 'NO_BRANCH_ACCESS_ALLOWED' };
  }

  const nameRegexes = info.branchNames.map((name) => new RegExp(`^${name.trim()}$`, 'i'));
  const idRegexes = info.idStrings.map((id) => new RegExp(`^${id.trim()}$`, 'i'));
  const allRegexes = [...nameRegexes, ...idRegexes];

  return {
    $or: [
      { createdByBranch: { $in: allRegexes } },
      { branch: { $in: allRegexes } }
    ]
  };
};

/**
 * Filter for Goods Received Notes (GRN) which store branch as string name
 */
const getGRNBranchFilter = async (req) => {
  const info = await resolveUserBranches(req);
  if (info.isAdminOrDirector) {
    return {};
  }

  if (!info.branchNames || info.branchNames.length === 0) {
    return { branch: 'NO_BRANCH_ACCESS_ALLOWED' };
  }

  const nameRegexes = info.branchNames.map((name) => new RegExp(`^${name.trim()}$`, 'i'));
  const idRegexes = info.idStrings.map((id) => new RegExp(`^${id.trim()}$`, 'i'));
  const allRegexes = [...nameRegexes, ...idRegexes];

  // For Colombo Main Branch (the initial default branch), also allow legacy GRNs with empty branch
  const isMainBranch = info.branchNames.some((n) => n.toLowerCase().includes('colombo') || n.toLowerCase().includes('main'));

  if (isMainBranch) {
    return {
      $or: [
        { branch: { $in: allRegexes } },
        { branch: '' },
        { branch: null },
        { branch: { $exists: false } }
      ]
    };
  }

  return {
    $or: [
      { branch: { $in: allRegexes } }
    ]
  };
};

/**
 * Resolve display branch name from branchId / ObjectId
 */
const resolveBranchName = async (branchKey) => {
  if (!branchKey) return 'Main Branch';
  const branches = await getBranches();
  const kStr = String(branchKey).trim();
  const found = branches.find(
    (b) =>
      (b._id && b._id.toString() === kStr) ||
      (b.branchId && b.branchId.toUpperCase() === kStr.toUpperCase()) ||
      (b.branchCode && b.branchCode.toUpperCase() === kStr.toUpperCase()) ||
      (b.branchName && b.branchName.toLowerCase() === kStr.toLowerCase())
  );
  return found ? found.branchName : branchKey;
};

module.exports = {
  getBranches,
  resolveUserBranches,
  getBranchFilter,
  getIssueNoteBranchFilter,
  getPOBranchFilter,
  getGRNBranchFilter,
  resolveBranchName
};
