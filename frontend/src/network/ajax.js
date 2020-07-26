/**
 * AJAX request module.
 */
export default function (url, options, timeout = 10000) {
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
