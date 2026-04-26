const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** Spinner on stderr; falls back to plain lines when stderr is not a TTY. */
export type Spinner = {
  /** Starts animation or prints a status line in non-TTY mode. */
  start: (message: string) => void;
  /** Updates the current message (TTY spinner only). */
  update: (message: string) => void;
  /** Clears the spinner; optional green check + final line. */
  stop: (finalLine?: string) => void;
  /** Clears the spinner; optional red cross + final line. */
  fail: (finalLine?: string) => void;
};

/**
 * Creates a CLI spinner bound to `process.stderr`.
 *
 * @returns Spinner API (`start`/`update`/`stop`/`fail`).
 */
export function createSpinner(): Spinner {
  let interval: ReturnType<typeof setInterval> | undefined;
  let message = "";
  let frame = 0;
  const out = process.stderr;

  const render = (): void => {
    const f = FRAMES[frame % FRAMES.length];
    frame += 1;
    out.write(`\r\x1b[2K${f} ${message}`);
  };

  const clearTimer = (): void => {
    if (interval !== undefined) {
      clearInterval(interval);
      interval = undefined;
    }
  };

  return {
    start(m: string) {
      clearTimer();
      message = m;
      frame = 0;
      if (!out.isTTY) {
        out.write(`… ${message}\n`);
        return;
      }
      out.write("\x1b[?25l");
      interval = setInterval(render, 90);
      render();
    },

    update(m: string) {
      message = m;
    },

    stop(finalLine?: string) {
      clearTimer();
      if (out.isTTY) {
        out.write("\x1b[2K\r");
        out.write("\x1b[?25h");
        if (finalLine) {
          out.write(`\x1b[32m✔\x1b[0m ${finalLine}\n`);
        }
      } else if (finalLine) {
        out.write(`✔ ${finalLine}\n`);
      }
    },

    fail(finalLine?: string) {
      clearTimer();
      if (out.isTTY) {
        out.write("\x1b[2K\r");
        out.write("\x1b[?25h");
        if (finalLine) {
          out.write(`\x1b[31m✖\x1b[0m ${finalLine}\n`);
        }
      } else if (finalLine) {
        out.write(`✖ ${finalLine}\n`);
      }
    },
  };
}
