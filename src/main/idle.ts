/**
 * When to show and hide the saver.
 *
 *   watching --idle >= threshold--> showing --input--> watching
 *
 * After a dismissal the machine stays disarmed until it has seen an idle
 * reading below the threshold, so a stale reading taken just after the
 * user's input cannot bring the saver straight back.
 */
export type IdleState = "watching" | "showing";
export type IdleAction = "show" | "hide";

export class IdleMachine {
  state: IdleState = "watching";
  private readonly thresholdSeconds: number;
  private armed = true;

  constructor(thresholdSeconds: number) {
    this.thresholdSeconds = thresholdSeconds;
  }

  /** Feed the current system idle time in seconds. */
  observe(idleSeconds: number): IdleAction | undefined {
    if (this.state !== "watching") return undefined;
    if (idleSeconds < this.thresholdSeconds) {
      this.armed = true;
      return undefined;
    }
    if (!this.armed) return undefined;
    return this.show();
  }

  /** Show on demand (tray menu, --now). */
  show(): IdleAction | undefined {
    if (this.state === "showing") return undefined;
    this.state = "showing";
    return "show";
  }

  /** The user pressed a key or moved the mouse. */
  input(): IdleAction | undefined {
    if (this.state !== "showing") return undefined;
    this.state = "watching";
    this.armed = false;
    return "hide";
  }
}
