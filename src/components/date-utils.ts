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
