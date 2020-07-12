/**
 * HTML Video element wrapper.
 *
 * @example
 *
 * import { Video } from './media/video'
 *
 * const video = Video();
 *
 */
export default function video() {
  let el;

  const render = () => {
    el = document.createElement('video');
    el.setAttribute('autoplay', '');
    el.setAttribute('playsinline', '');
    el.classList.add('video');
    el.innerText = "Your browser doesn't support video";

    return el;
  };

  const reset = () => {
    el.pause();
    el.src = '';
    el.load();
  };

  return {
    render,
    get: el,
    reset,
  };
}
