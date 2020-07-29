export function fromJson(data) {
  let result;
  try {
    result = JSON.parse(data);
  } catch (e) {
    console.error('[data] non-parsable JSON', data);
  }

  return result;
}
