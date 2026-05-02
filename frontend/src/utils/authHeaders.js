export const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  const roleId = localStorage.getItem('roleId');
  const branchId = localStorage.getItem('branchId');
  const allowedBranches = localStorage.getItem('allowedBranches');

  if (roleId) headers['x-user-role'] = roleId;
  if (branchId) headers['x-user-branch'] = branchId;
  if (allowedBranches) headers['x-allowed-branches'] = allowedBranches;

  return headers;
};
