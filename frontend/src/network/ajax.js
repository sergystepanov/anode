/**
 * AJAX request module.
 * @version 1
 */
const defaultTimeout = 10000;

export function _fetch(url, options, timeout = defaultTimeout) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const signal = controller.signal;
    const allOptions = Object.assign({}, options, signal);

    // fetch(url, {...options, signal})
    fetch(url, allOptions).then(resolve, () => {
      controller.abort();
      return reject;
    });

    // auto abort when a timeout reached
    setTimeout(() => {
      controller.abort();
      reject();
    }, timeout);
  });
}
