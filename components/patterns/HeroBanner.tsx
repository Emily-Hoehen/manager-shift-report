"use client";

import { Button } from "../ui/Button";
import { Marquee } from "../ui/Marquee";
import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon } from "./icons";
import styles from "./HeroBanner.module.css";

/**
 * HeroBanner — Front Page site header
 * Source: Figma fileKey iu8cX5Ew8b1vh1LUC3NLwz, node 10719:695.
 * Photo collage + gradient scrim, site identity, and a date
 * picker that's presentational here (no calendar wired up — the
 * design doesn't specify one).
 */

export type HeroBannerTheme = "dark" | "light";

export type HeroBannerProps = {
  theme?: HeroBannerTheme;
  logo: string;
  siteName: string;
  client: string;
  images: string[];
  dateLabel: string;
  onViewScope?: () => void;
  onPrevDate?: () => void;
  onNextDate?: () => void;
};

export function HeroBanner({
  theme = "light",
  logo,
  siteName,
  client,
  images,
  dateLabel,
  onViewScope,
  onPrevDate,
  onNextDate,
}: HeroBannerProps) {
  const actions = (
    <>
      <Button variant="primary" theme="light" endIcon={<ArrowRightIcon />} onClick={onViewScope}>
        View Scope of Work
      </Button>
      <div className={styles.datePicker}>
        <button type="button" className={styles.dateCaret} onClick={onPrevDate} aria-label="Previous day">
          <CaretLeftIcon />
        </button>
        <span className={styles.dateLabel}>{dateLabel}</span>
        <button type="button" className={styles.dateCaret} onClick={onNextDate} aria-label="Next day">
          <CaretRightIcon />
        </button>
      </div>
    </>
  );

  return (
    <div className={styles.hero} data-theme={theme}>
      <div className={styles.stage}>
        <Marquee className={styles.collage} trackClassName={styles.collageTrack} durationSeconds={36}>
          {images.map((src) => (
            <div className={styles.tile} key={src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className={styles.tileImage} />
            </div>
          ))}
        </Marquee>
        <div className={styles.scrim} aria-hidden="true" />

        <div className={styles.identity}>
          <div className={styles.logoFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" className={styles.logo} />
          </div>
          <div className={styles.label}>
            <h4 className={styles.siteName}>{siteName}</h4>
            <p className={styles.client}>{client}</p>
          </div>
        </div>

        <div className={styles.actionsDesktop}>{actions}</div>
      </div>

      <div className={styles.actionsMobile}>{actions}</div>
    </div>
  );
}
