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

const months = [
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
