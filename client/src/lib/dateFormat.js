export const dateFormat = (date) => {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'short',  // e.g., "Mon"
    month: 'long',     // e.g., "June"
    day: 'numeric',    // e.g., "29"
    hour: 'numeric',   // e.g., "4 PM"
    minute: 'numeric'  // e.g., "08"
  });
};