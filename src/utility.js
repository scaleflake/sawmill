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


// NOTE: taken from vue-infinite-loading
export const scrollBarStorage = {
  key: '_infiniteScrollHeight',
  getScrollElm(elm) {
    return elm === window ? document.documentElement : elm;
  },
  save(elm) {
    const target = this.getScrollElm(elm);

    // save scroll height on the scroll parent
    target[this.key] = target.scrollHeight;
  },
  restore(elm) {
    const target = this.getScrollElm(elm);

    /* istanbul ignore else */
    if (typeof target[this.key] === 'number') {
      target.scrollTop = target.scrollHeight - target[this.key] + target.scrollTop;
    }

    this.remove(target);
  },
  remove(elm) {
    if (elm[this.key] !== undefined) {
      // remove scroll height
      delete elm[this.key];
    }
  },
};


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
