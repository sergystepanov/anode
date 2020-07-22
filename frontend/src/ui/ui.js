export function setError(text) {
  console.error(text);
  var span = document.getElementById('status');
  span.textContent = text;
  span.classList.add('error');
}

export function clearError() {
  // Clear errors in the status span
  var span = document.getElementById('status');
  span.classList.remove('error');
  span.textContent = '';
}

export function setStatus(text) {
  console.log(text);
  var span = document.getElementById('status');
  // Don't set the status if it already contains an error
  if (!span.classList.contains('error')) span.textContent = text;
}

export function showPeerId(id) {
  document.getElementById('peer-id').textContent = id;
}
