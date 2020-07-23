export default function ({
  constraints = { video: true, audio: true },
  onNotSupported,
  onError,
} = {}) {
  let supported = !!navigator.mediaDevices.getUserMedia;
  let stream;

  if (!supported) {
    onNotSupported?.();
  }

  if (navigator.mediaDevices.getUserMedia) {
    return;
  } else {
    errorUserMediaHandler();
  }

  const getStream = async () => {
    if (!supported) return Promise.reject();

    let stream_;
    try {
      stream_ = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      onError?.(e);
      return Promise.reject();
    }

    stream = stream_;

    return stream;
  };

  const stop = () => {
    if (!supported) return;

    // Release the webcam and mic
    stream?.getTracks().forEach(function (track) {
      track.stop();
    });
  };

  return Object.freeze({
    getStream,
    stop,
  });
}
