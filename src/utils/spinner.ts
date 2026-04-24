const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export type Spinner = {
  start: (message: string) => void;
  update: (message: string) => void;
  stop: (finalLine?: string) => void;
  fail: (finalLine?: string) => void;
};

/**
 * Spinner on stderr so it does not mix with the child build stdout.
 * Without a TTY, prints plain status lines instead.
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
