/**
 * Adds stereo params for provided SDP codec.
 *
 * a=rtpmap:xx OPUS/48000/2
 *
 * @param {string} sdp The text representation of SDP.
 * @param {string} name A search case insensitive codec (e.g. opus).
 * @param {Object} params A map of params to add.
 */
export const addParamsToCodec = (sdp, name, params) => {
  const _params = Object.entries(params)
    .map((x) => `${x[0]}=${x[1]}`)
    .join(';');

  let search = new RegExp(`a=rtpmap:(\\d+) ${name}/`, 'gim');
  let found;
  while ((found = search.exec(sdp)) !== null) {
    found.shift();
    found.forEach((n) => {
      console.info(`[sdp] mod /${name}/ track #${n}`);
      sdp = sdp.replace(new RegExp(`(a=fmtp:${n} .*)`), `$1;${_params}`);
    });
  }

  return sdp;
};
