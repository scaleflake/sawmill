export function restoreDollarSignsAndDots(req) {
  const restoreDollarSigns = (object) => (
    Object.fromEntries(
      Object
        .entries(object)
        .map(([k, v]) => [k.startsWith('%24') ? k.replace('%24', '$') : k, v]),
    )
  );
  const restoreDots = (object) => (
    Object.fromEntries(
      Object
        .entries(object)
        .map(([k, v]) => [k.replace(/%2E/g, '.'), v]),
    )
  );

  if (req) {
    if (req.params) {
      req.params = restoreDollarSigns(req.params); // eslint-disable-line no-param-reassign
    }
    if (req.query) {
      req.query = restoreDollarSigns(restoreDots(req.query)); // eslint-disable-line no-param-reassign
    }
    if (req.body) {
      req.body = restoreDollarSigns(req.body); // eslint-disable-line no-param-reassign
    }
  }

  return req;
}


export const months = [
  'jan', 'feb',
  'mar', 'apr',
  'may', 'jun',
  'jul', 'aug',
  'sep', 'oct',
  'nov', 'dec',
];
export function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const h = date.getHours();
  const min = date.getMinutes();
  const dateString = `${d} ${months[m]} ${y}, ${h}:${min < 10 ? `0${min}` : min}`;
  return dateString;
}


export function queue() {
  let isBusy = false;

  const tasks = [];

  const doNextTask = (func) => {
    func().finally(() => {
      if (!tasks.length) {
        isBusy = false;
      } else {
        doNextTask(tasks.shift());
      }
    });
  };

  return {
    schedule(func) {
      if (isBusy) {
        tasks.push(func);
      } else {
        isBusy = true;
        doNextTask(func);
      }
    },
  };
}


export function binarySearch(ar, el, compare) {
  let m = 0;
  let n = ar.length - 1;
  while (m <= n) {
    const k = (n + m) >> 1;
    const cmp = compare(el, ar[k]);
    if (cmp > 0) {
      m = k + 1;
    } else if (cmp < 0) {
      n = k - 1;
    } else {
      return k;
    }
  }
  return m;
}
