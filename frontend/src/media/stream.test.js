import Stream from './stream';

window.HTMLMediaElement.prototype.load = () => {
  /* do nothing */
};
window.HTMLMediaElement.prototype.pause = () => {
  /* do nothing */
};

const v = Stream();

beforeAll(() => {
  v.render();
});

test('if stream module is initialized', () => {
  expect(v.get()).not.toBeUndefined();
});

test('if streams are attached', () => {
  const stream = new Blob();
  v.addSource(stream);
  v.addSource(stream);
  v.addSource(stream);
  expect(v.get().src).not.toBeUndefined();
});

test('if stream is cleared', () => {
  v.reset();
  expect(v.get().srcObject).toBeUndefined();
});

test('if custom video options are set', () => {
  const vv = Stream({
    ignore: undefined,
    volume: 0.5,
  });

  vv.render();
  expect(vv.get().getAttribute('ignore')).toBe(null);
  expect(vv.get().volume).toBe(0.5);
});
