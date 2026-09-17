"use client";

import { useState } from "react";
import { Nav } from "./Nav";
import { ManagerQueuePanel } from "./ManagerQueuePanel";
import { HeroBanner } from "./HeroBanner";
import { OliviaFab } from "./OliviaFab";
import { PeopleManagementSection } from "./PeopleManagementSection";
import { SitePerformanceSection } from "./SitePerformanceSection";
import { CommunicationsSection } from "./CommunicationsSection";
import { ThemeToggle, type ThemeToggleTheme } from "../ui/ThemeToggle";
import {
  BellIcon,
  BriefcaseIcon,
  ClipboardIcon,
  EnvelopeIcon,
  MoreIcon,
  PinIcon,
  PlusCircleIcon,
} from "./icons";
import {
  siteInfo,
  oliviaAvatar,
  clockedInAvatars,
  peopleManagement,
  sitePerformance,
  communications,
} from "../../lib/homeDashboardData";
import type { DashboardPerson } from "../../lib/homeDashboardData";
import styles from "./HomeDashboard.module.css";

/**
 * HomeDashboard — "Single Site / Front Page" homepage
 * Source: Figma fileKey iu8cX5Ew8b1vh1LUC3NLwz, node 10719:694.
 *
 * The source design only shows a light theme. Dark mode below
 * extrapolates from the DS2 LT/DT token pairs already used
 * throughout this project (Nav, Button, RosterDemo) rather than a
 * second Figma reference — see app/globals.css's "Dashboard
 * surfaces" comment. Defaults to light per the design; the toggle
 * in the nav switches to the dark build on request.
 *
 * Nav's utility icons and Olivia placement follow the reduced
 * "Navbar" variant in the Olivia file instead (fileKey
 * I7TFV5MGgQwMlRjKlwJlBT, node 2197:16145): Olivia moves out of the
 * bar into OliviaFab, and the utility set drops Time in favor of
 * Quick Entries/Clipboard/Messages/Notifications.
 */

export type HomeDashboardProps = {
  currentUser?: DashboardPerson;
};

export function HomeDashboard({ currentUser }: HomeDashboardProps) {
  const [theme, setTheme] = useState<ThemeToggleTheme>("light");
  const [managerQueueOpen, setManagerQueueOpen] = useState(false);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className={styles.page} data-theme={theme}>
      <Nav
        theme={theme}
        orgLabel="SBM"
        orgIcon={<BriefcaseIcon />}
        siteLabel={siteInfo.client}
        siteSubLabel={siteInfo.siteName}
        siteIcon={<PinIcon />}
        links={[
          { label: "Home", href: "#", active: true },
          { label: "Quality", href: "/quality/scope-of-work" },
          { label: "People", href: "/roster" },
          { label: "Safety", href: "#" },
          { label: "Financials", href: "#" },
          { label: "Map", href: "/map" },
          { label: "Manager App", href: "/manager-app" },
        ]}
        showOlivia={false}
        utilityItems={[
          { icon: <PlusCircleIcon />, label: "Quick entries" },
          { icon: <ClipboardIcon />, label: "Manager Queue", onClick: () => setManagerQueueOpen(true) },
          { icon: <EnvelopeIcon />, label: "Messages" },
          { icon: <BellIcon />, label: "Notifications", hasNotification: true },
        ]}
        avatarSrc={currentUser?.avatar}
        avatarFallback={currentUser ? undefined : "EH"}
        avatarAlt={currentUser?.name ?? "Account"}
        menuIcon={<MoreIcon />}
        trailing={<ThemeToggle theme={theme} onChange={setTheme} />}
      />

      <main className={styles.main}>
        <HeroBanner
          logo={siteInfo.logo}
          siteName={siteInfo.siteName}
          client={siteInfo.client}
          images={siteInfo.heroImages}
          dateLabel={`Today, ${today}`}
        />

        <PeopleManagementSection theme={theme} data={peopleManagement} clockedInAvatars={clockedInAvatars} />
        <SitePerformanceSection theme={theme} data={sitePerformance} />
        <CommunicationsSection theme={theme} data={communications} />
      </main>

      <OliviaFab theme={theme} avatarSrc={oliviaAvatar} />

      <ManagerQueuePanel open={managerQueueOpen} onClose={() => setManagerQueueOpen(false)} theme={theme} />
    </div>
  );
}
