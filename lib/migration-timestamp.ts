const migrationTimestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3,6})Z$/;

function validCalendarComponents(match: RegExpMatchArray) {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= monthDays[month - 1] &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59
  );
}

export function canonicaliseMigrationTimestamp(value: string) {
  const match = value.match(migrationTimestampPattern);
  if (!match) {
    throw new Error('Migration timestamp must be an exact UTC value with 3 to 6 fractional digits.');
  }
  const fraction = match[7].replace(/0+$/, '').padEnd(3, '0');
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.${fraction}Z`;
}

export function isCanonicalMigrationTimestamp(value: string) {
  try {
    const match = value.match(migrationTimestampPattern);
    return Boolean(match && validCalendarComponents(match) && canonicaliseMigrationTimestamp(value) === value);
  } catch {
    return false;
  }
}
