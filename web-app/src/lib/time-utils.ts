export function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0;
  
  // Basic parser for "1h 30m", "15m", "2h", "1.5h"
  // Normalize: remove generic text, keep numbers and h/m
  const lower = duration.toLowerCase().replace(/\s/g, "");
  
  let totalSeconds = 0;
  
  // Match hours
  const hoursMatch = lower.match(/(\d+(\.\d+)?)h/);
  if (hoursMatch) {
    totalSeconds += parseFloat(hoursMatch[1]) * 3600;
  }
  
  // Match minutes
  const minutesMatch = lower.match(/(\d+(\.\d+)?)m/);
  if (minutesMatch) {
    totalSeconds += parseFloat(minutesMatch[1]) * 60;
  }
  
  // If no units found, assume minutes if just a number (Jira default behavior usually)
  // But let's be strict or assume minutes for safety if just digits
  if (!hoursMatch && !minutesMatch && /^\d+(\.\d+)?$/.test(lower)) {
     totalSeconds += parseFloat(lower) * 60;
  }
  
  return Math.round(totalSeconds);
}
