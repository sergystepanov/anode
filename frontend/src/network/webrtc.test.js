import { builder as WebRTC } from './webrtc';

test('if the builder is building', () => {
  const rtc = WebRTC().withSignaling().build();

  expect(rtc).toBeDefined();
});
