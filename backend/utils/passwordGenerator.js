// Default password length
const DEFAULT_PASSWORD_LENGTH = 12;

exports.generatePasswordByRole = (roleId) => {
  console.log('generatePasswordByRole called with roleId:', roleId);
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < DEFAULT_PASSWORD_LENGTH; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  console.log('Generated password length:', password.length, 'Password:', password);
  return password;
};
