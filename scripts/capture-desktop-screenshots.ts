import { runCapture } from './capture-screenshots';

runCapture('desktop').catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
