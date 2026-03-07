import { runCapture } from './capture-screenshots';

runCapture('mobile').catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
