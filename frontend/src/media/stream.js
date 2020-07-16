import './stream.css';

/**
 * Stream module based on the HTML5 Video element.
 *
 * Contains a wrapper for HTML Video element
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video}.
 *
 * @module media/stream
 * @example
 *
 * import Stream from './media/stream'
 *
 * const s = Stream();
 *
 */
export default function (
  opts = {
    autoplay: true,
    controls: true,
    muted: false,
    preload: 'none',
    volume: '0.2',
  }
) {
  let el;

  const render = () => {
    el = document.createElement('video');

    // !to rewrite
    Object.keys(opts).forEach((key) => {
      const value = opts[key];

      if (value === undefined) return;

      let setValue;
      if (typeof opts[key] === 'boolean') {
        setValue = value === true ? '' : value;
      } else {
        setValue = value;
      }

      el.setAttribute(key, setValue);
    });

    el.classList.add('stream');
    el.innerText = "Your browser doesn't support HTML5 video.";

    return el;
  };

  /**
   * @returns {HTMLVideoElement} An internal HTML5 video element if it is rendered.
   */
  const get = () => el,

  /**
   * Resets (reloads) internal HTML5 video element.
   */
  const reset = () => {
    el.pause();
    el.src = '';
    el.srcObject = undefined;
    el.load();
  };
 
  /**
   * Attaches stream source to the internal HTML5 video element.
   * 
   * @param {MediaStream} stream A stream source to attach.
   */
  const addSource = (stream) => {
    if (el.srcObject === stream) return;

    console.info(`[video] adding stream`);
    el.srcObject = stream;
  };

  return Object.freeze({
    addSource,
    get,
    render,
    reset,
  });
}
