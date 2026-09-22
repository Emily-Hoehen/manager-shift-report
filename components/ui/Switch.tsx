"use client";

import styles from "./Switch.module.css";

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
};

/** Switch — small on/off pill toggle, e.g. for a boolean flag on a list row. */
export function Switch({ checked, onChange, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={styles.switch}
      data-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
