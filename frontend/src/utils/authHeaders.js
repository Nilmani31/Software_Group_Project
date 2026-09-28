export const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  const roleId = localStorage.getItem('roleId');
  const branchId = localStorage.getItem('branchId');
  const allowedBranches = localStorage.getItem('allowedBranches');
  const branchName = localStorage.getItem('branchName');
  const userId = localStorage.getItem('userId');
  const permissions = localStorage.getItem('permissions');

  if (roleId) headers['x-user-role'] = roleId;
  if (branchId) headers['x-user-branch'] = branchId;
  if (allowedBranches) headers['x-allowed-branches'] = allowedBranches;
  if (branchName) headers['x-user-branch-name'] = branchName;
  if (userId) headers['x-user-id'] = userId;
  if (permissions) headers['x-user-permissions'] = permissions;

  return headers;
};
