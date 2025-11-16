exports.generatePasswordByRole = (roleId) => {
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number

  switch (roleId) {
    case "ADMIN":
      return `AD-${randomPart}`;
    case "DIRECTOR":
      return `DIR-${randomPart}`;
    case "MANAGER":
      return `MGR-${randomPart}`;
    case "Branch_MANAGER":
      return `BM-${randomPart}`;
    case "STAFF":
      return `ST-${randomPart}`;
    
  }
};
