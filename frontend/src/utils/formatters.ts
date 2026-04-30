import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const formatCurrency = (amount: string | number, currency = 'SAR'): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-SA', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num)
}

export const formatDate = (date: string, format = 'MMM D, YYYY'): string => {
    return dayjs(date).format(format);
}

export const formatRelativeTime = (date: string): string => {
    return dayjs(date).fromNow();
}

export const formatNumber = (num: number | string): string => {
    const n = typeof num === 'string' ? parseInt(num) : num;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}