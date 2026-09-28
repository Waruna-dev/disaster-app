/**
 * Validates a Sri Lankan phone number.
 * Accepts formats like: 0712345678, +94712345678, 94712345678
 * 
 * @param number Phone number to validate (spaces and hyphens should be removed before passing)
 * @returns boolean indicating if valid
 */
export const isValidSriLankanPhoneNumber = (number: string): boolean => {
  const regex = /^(?:0\d{9}|\+94\d{9}|94\d{9})$/;
  return regex.test(number);
};
