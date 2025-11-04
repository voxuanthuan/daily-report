import moment from "moment";


export function getDateInfo() {
    const today = moment();
    const isMonday = today.day() === 1;
    const previousDayLabel = isMonday ? 'Last Friday' : 'Yesterday';
    const previousDay = getPreviousWorkday();
    return { previousDay, previousDayLabel };
}

export function getPreviousWorkday(referenceDate?: moment.Moment): string {
    const date = referenceDate ? moment(referenceDate) : moment();
    return date.day() === 1 ? date.subtract(3, 'days').format('YYYY-MM-DD') : date.subtract(1, 'days').format('YYYY-MM-DD');
}

export function getSmartDateLabel(actualDate: string | null): string {
    if (!actualDate) {
        return 'Yesterday';
    }

    const today = moment.tz('Australia/Sydney');
    const workDate = moment.tz(actualDate, 'Australia/Sydney');
    const daysDiff = today.diff(workDate, 'days');

    // If it's actually yesterday, show "Yesterday"
    if (daysDiff === 1) {
        return 'Yesterday';
    }

    // If it's today's date (shouldn't happen but just in case)
    if (daysDiff === 0) {
        return 'Today';
    }

    // If it's Monday and work was on Friday (3 days ago)
    if (today.isoWeekday() === 1 && daysDiff === 3 && workDate.isoWeekday() === 5) {
        return 'Last Friday';
    }

    // For other cases, show the day name and date
    const dayName = workDate.format('dddd');
    const formattedDate = workDate.format('DD/MM');

    // Always add "Last" prefix when it's a previous workday (more than 1 day ago)
    return `Last ${dayName} (${formattedDate})`;
}
