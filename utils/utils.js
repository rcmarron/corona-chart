/* eslint-disable func-names */
/* eslint-disable no-plusplus */
/* eslint-disable no-multi-assign */
import slugify from 'slugify';

export const csvToArray = (text) => {
  let p = '';
  let row = [''];
  const ret = [row];
  let i = 0;
  let r = 0;
  let s = !0;
  let l;
  // eslint-disable-next-line no-restricted-syntax
  for (l of text) {
    if (l === '"') {
      if (s && l === p) row[i] += l;
      s = !s;
    } else if (l === ',' && s) l = row[++i] = '';
    else if (l === '\n' && s) {
      if (p === '\r') row[i] = row[i].slice(0, -1);
      row = ret[++r] = [(l = '')];
      i = 0;
    } else row[i] += l;
    p = l;
  }
  return ret;
};

export const getRegionKey = (state, country) => slugify(`${state ? `${state}_` : ''}${country}`);

export const getDateColumnString = dateObject => `${dateObject.getMonth() + 1}/${dateObject.getDate()}/${dateObject
  .getFullYear()
  .toString()
  .slice(-2)}`;

// eslint-disable-next-line no-extend-native
Date.prototype.addDays = function (days) {
  const date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

export const getDateArray = (startDate, stopDate) => {
  const dateArray = [];
  let currentDate = startDate;
  while (currentDate <= stopDate) {
    dateArray.push(new Date(currentDate));
    currentDate = currentDate.addDays(1);
  }
  return dateArray;
};

export const getDateFromString = (string) => {
  const parts = string.split('/');

  const month = parts[0];
  const day = parts[1];
  const year = 2000 + parts[2];

  return new Date(year, month, day);
};

export const getDaysBackRange = (
  array,
  currentIndex,
  startDaysBack,
  endDaysBack,
) => array.slice(
  Math.max(0, currentIndex - startDaysBack),
  Math.max(0, currentIndex - endDaysBack),
);
