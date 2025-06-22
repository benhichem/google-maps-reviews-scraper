/**
 * Converts relative date strings like "2 days ago", "1 week ago" to Date objects
 * @param relativeDateString - The relative date string to parse
 * @returns Date object representing the parsed date, or null if parsing fails
 */
/* export function parseRelativeDate(relativeDateString: string): Date | null {
  const now = new Date();
  const trimmed = relativeDateString.trim().toLowerCase();

  // Match pattern: number + time unit + "ago"
  const match = trimmed.match(
    /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/
  );

  if (!match) {
    return null;
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  const result = new Date(now);

  switch (unit) {
    case "second":
      result.setSeconds(result.getSeconds() - amount);
      break;
    case "minute":
      result.setMinutes(result.getMinutes() - amount);
      break;
    case "hour":
      result.setHours(result.getHours() - amount);
      break;
    case "day":
      result.setDate(result.getDate() - amount);
      break;
    case "week":
      result.setDate(result.getDate() - amount * 7);
      break;
    case "month":
      result.setMonth(result.getMonth() - amount);
      break;
    case "year":
      result.setFullYear(result.getFullYear() - amount);
      break;
    default:
      return null;
  }

  return result;
} */
export function parseRelativeDate(relativeDateString: string): Date | null {
  const now = new Date();
  const trimmed = relativeDateString.trim().toLowerCase();

  // Match pattern: "a/an" + time unit + "ago" OR number + time unit + "ago"
  const match = trimmed.match(
    /^(a|an|\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/
  );

  if (!match) {
    return null;
  }

  const amountStr = match[1];
  const unit = match[2];

  // Convert "a" or "an" to 1, otherwise parse the number
  const amount =
    amountStr === "a" || amountStr === "an" ? 1 : parseInt(amountStr, 10);

  const result = new Date(now);

  switch (unit) {
    case "second":
      result.setSeconds(result.getSeconds() - amount);
      break;
    case "minute":
      result.setMinutes(result.getMinutes() - amount);
      break;
    case "hour":
      result.setHours(result.getHours() - amount);
      break;
    case "day":
      result.setDate(result.getDate() - amount);
      break;
    case "week":
      result.setDate(result.getDate() - amount * 7);
      break;
    case "month":
      result.setMonth(result.getMonth() - amount);
      break;
    case "year":
      result.setFullYear(result.getFullYear() - amount);
      break;
    default:
      return null;
  }

  return result;
}
/**
 * Compares two dates and returns true if date1 is before date2
 * @param date1 - First date (Date object or ISO string)
 * @param date2 - Second date (Date object or ISO string)
 * @returns true if date1 is after date2, false otherwise, or null if either date is invalid
 * will return true if newDate is after or equal the last Scraped Date
 * @example
 * isDateBefore("2023-10-01", "2023-09-30" ) // returns true
 * isDateBefore("2023-09-30", "2023-10-01" ) // returns false
 */
export function isDateBefore(
  newDate: Date | string | null,
  lastScrapedDate: Date | string | null
): boolean | null {
  try {
    // Handle null inputs
    if (newDate === null || lastScrapedDate === null) {
      return null;
    }

    const d1 = newDate instanceof Date ? newDate : new Date(newDate);
    const d2 =
      lastScrapedDate instanceof Date
        ? lastScrapedDate
        : new Date(lastScrapedDate);

    // Check if dates are valid
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return null;
    }

    return d1 >= d2;
  } catch (error) {
    return null;
  }
}

/* console.log(parseRelativeDate("a week ago")); */ // returns false
