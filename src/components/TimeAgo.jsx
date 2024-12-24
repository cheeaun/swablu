import { useState, useEffect } from 'react';

export default function TimeAgo({ dateTime }) {
  const [_, refresh] = useState(0);
  useEffect(() => {
    if (!dateTime) return;
    // Refresh this based on time diff from now
    // If < 60s, refresh every 10s
    // If < 1h, refresh every 1m
    // If > 1h, refresh every 1h
    // else don't refresh
    const now = Date.now();
    const diff = now - new Date(dateTime).getTime();
    let timer;
    if (diff < 60000) {
      timer = 10000;
    } else if (diff < 3600000) {
      timer = 60000;
    } else if (diff < 86400000) {
      timer = 3600000;
    } else {
      return;
    }
    const interval = setInterval(() => {
      refresh((r) => r + 1);
    }, timer);
    return () => clearInterval(interval);
  }, [dateTime]);

  if (!dateTime) return null;
  return (
    <time dateTime={dateTime} title={humaneDate(dateTime)}>
      {timeAgo(dateTime)}
    </time>
  );
}

function humaneDate(inputDate) {
  const date = new Date(inputDate);
  if (Number.isNaN(date)) return '';
  return date.toLocaleString();
}

const DTF = new Intl.DateTimeFormat(undefined, {
  numeric: 'auto',
  style: 'narrow',
});

const RTF = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
  style: 'narrow',
});

function timeAgo(inputDate) {
  const date = new Date(inputDate);
  if (Number.isNaN(date)) return '';

  const now = new Date();
  const diffInMs = date - now;

  const units = [
    { unit: 'year', ms: 31536000000 },
    { unit: 'month', ms: 2628000000 },
    { unit: 'day', ms: 86400000 },
    { unit: 'hour', ms: 3600000 },
    { unit: 'minute', ms: 60000 },
    { unit: 'second', ms: 1000 },
  ];

  for (const { unit, ms } of units) {
    const diff = Math.round(diffInMs / ms);
    if (Math.abs(diff) >= 1) {
      // if months or years, show narrow date
      if (unit === 'month' || unit === 'year') {
        return DTF.format(date);
      }
      return RTF.format(diff, unit);
    }
  }

  return RTF.format(0, 'second');
}
