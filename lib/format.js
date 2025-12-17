/**
 * Output formatting utilities for CLI scripts
 * Provides consistent, clean output with spinners and status indicators
 */

import chalk from 'chalk';
import ora from 'ora';

/**
 * Consolidated formatting utilities
 */
export const format = {
  // Success states (matching kukla-integration-service exactly)
  success: (message) => chalk.green(`✔ ${message}`),
  majorSuccess: (message) => chalk.green(`✅ ${message}`),
  
  // Error states
  error: (message) => chalk.red(`✖ ${message}`),
  warning: (message) => chalk.yellow(`⚠  ${message}`),
  
  // Actions
  action: (message) => `🗑️  ${message}`,
  search: (message) => `🔍 ${message}`,
  validate: (message) => `✔ ${message}`,
  
  // Text styles
  muted: (message) => chalk.gray(message),
  bold: (message) => chalk.bold(message),
  
  // Utility
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Execute async function with spinner (matching kukla-integration-service)
 * @param {string} spinnerText - Text to show while spinning
 * @param {Function} asyncFn - Async function to execute
 * @returns {Promise} Result of async function
 */
export async function withSpinner(spinnerText, asyncFn) {
  const spinner = ora({
    text: spinnerText,
    spinner: 'dots',
  }).start();

  try {
    const result = await asyncFn();
    spinner.stop();
    return result;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

/**
 * Execute async function with appropriate progress indicator
 * Automatically shows spinner or allows progress bar based on hasProgressBar flag
 * 
 * @param {string} actionText - Action description (e.g., "Deleting demo customers")
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Options:
 *   - hasProgressBar: boolean - Whether operation shows its own progress bar
 *   - showHeader: boolean - Whether to show action header (default: true)
 *   - returnResult: boolean - Whether to return raw result (default: false)
 * @returns {Promise} Result of async function
 */
export async function withProgress(actionText, asyncFn, options = {}) {
  const { 
    hasProgressBar = false, 
    showHeader = true,
    returnResult = false 
  } = options;
  
  // Print action header if requested
  if (showHeader) {
    console.log('');
    console.log(`🗑️  ${actionText}...`);
  }
  
  const startTime = Date.now();
  let spinner = null;
  
  try {
    // If operation doesn't have its own progress bar, start a spinner
    if (!hasProgressBar) {
      spinner = ora({
        text: format.muted('Processing...'),
        spinner: 'dots',
      }).start();
    }
    
    const result = await asyncFn();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (spinner) {
      spinner.stop();
    }
    
    // If returnResult is true, just return the raw result (for simple operations)
    if (returnResult) {
      console.log(format.success(actionText));
      return result;
    }
    
    // Format result summary for operations with counts
    const { deleted = 0, failed = 0, notFound = 0, created = 0, existing = 0 } = result;
    
    // Determine if this was a creation or deletion operation
    const totalProcessed = deleted || created || existing;
    
    if (totalProcessed === 0 && failed === 0) {
      console.log(format.muted(`✔ ${actionText} completed (none found, ${duration}s)`));
    } else if (failed > 0) {
      const summary = deleted > 0 
        ? `${deleted} deleted, ${failed} failed${notFound > 0 ? `, ${notFound} not found` : ''}`
        : `${created} created, ${existing} existing, ${failed} failed`;
      console.log(format.warning(`${actionText} completed (${summary}, ${duration}s)`));
    } else {
      const summary = deleted > 0
        ? `${deleted} deleted${notFound > 0 ? `, ${notFound} not found` : ''}`
        : `${created} created, ${existing} existing`;
      console.log(format.success(`${actionText} completed (${summary}, ${duration}s)`));
    }
    
    return result;
  } catch (error) {
    if (spinner) {
      spinner.stop();
    }
    console.log(format.error(`${actionText} failed: ${error.message}`));
    throw error;
  }
}

/**
 * Update a single line in the terminal (no newline)
 * Uses ANSI escape codes to clear and rewrite the line
 * @param {string} message - Message to display
 */
export function updateLine(message) {
  if (process.stdout.isTTY) {
    // Clear the entire line and move cursor to start, then write new message
    // \r = carriage return (move to start)
    // \x1b[K = ANSI escape code to clear from cursor to end of line
    process.stdout.write(`\r\x1b[K${message}`);
  } else {
    // Non-TTY: just print the message normally
    console.log(message);
  }
}

/**
 * Finish a progress line (add newline)
 */
export function finishLine() {
  if (process.stdout.isTTY) {
    process.stdout.write('\n');
  }
}

export default { format, withSpinner, withProgress, updateLine, finishLine };

