// Default password length
const DEFAULT_PASSWORD_LENGTH = 12;

exports.generatePasswordByRole = (roleId) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < DEFAULT_PASSWORD_LENGTH; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
};
