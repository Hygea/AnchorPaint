import { defineConfig } from 'vite';

export default defineConfig({
  // Keeps local / and GitHub Pages /AnchorPaint/ builds identical. The production
  // browser check verifies JS, CSS, STL and 3MF URLs under the deployed prefix.
  base: './',
});
