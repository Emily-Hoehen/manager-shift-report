"use client";

import { useState } from "react";
import { Nav, type NavDropdownEntry } from "./Nav";
import { ManagerQueuePanel } from "./ManagerQueuePanel";
import { BellIcon, BriefcaseIcon, ClipboardIcon, EnvelopeIcon, MoreIcon, PinIcon, PlusCircleIcon } from "./icons";
import { siteInfo } from "../../lib/homeDashboardData";

export type SowVariant = "scopeOfWork" | "complianceAcknowledgement" | "complianceAcknowledgementV2";

export type SowNavProps = {
  /** Which Scope of Work prototype this page is — highlights the matching item in the Quality dropdown. */
  current: SowVariant;
};

/**
 * SowNav — the Nav config shared by every Scope of Work page
 * variant. Mirrors HomeDashboard's Nav (same org/site labels,
 * utility icons) so the header is consistent across Home and every
 * Quality > Scope of Work exploration. Light theme only.
 *
 * Quality renders as a click-to-open dropdown instead of a plain
 * link, since this project still keeps a couple of parallel SOW
 * explorations side by side rather than one settled page: the
 * flagship "Scope of Work" page, its frozen "Compliance
 * Acknowledgement" snapshot (see ComplianceAcknowledgementPage — an
 * intentional duplicate, preserved as-is rather than re-exported, so
 * edits to Scope of Work don't drift the saved copy), and its own
 * "Compliance Acknowledgement V2" fork (ComplianceAcknowledgementV2Page)
 * trying out a Missed Services quick filter in the Your Spaces grid/list.
 */
export function SowNav({ current }: SowNavProps) {
  const [managerQueueOpen, setManagerQueueOpen] = useState(false);
  const items: NavDropdownEntry[] = [
    {
      label: "Scope of Work",
      href: "/quality/scope-of-work",
      active: current === "scopeOfWork",
      icon: <i className="fa-solid fa-plane" />,
    },
    {
      label: "Compliance Acknowledgement",
      href: "/quality/compliance-acknowledgement",
      active: current === "complianceAcknowledgement",
      icon: <i className="fa-solid fa-clipboard-check" />,
    },
    {
      label: "Compliance Acknowledgement V2",
      href: "/quality/compliance-acknowledgement-v2",
      active: current === "complianceAcknowledgementV2",
      icon: <i className="fa-solid fa-clipboard-check" />,
    },
  ];

  return (
    <>
      <Nav
        theme="light"
        orgLabel="SBM"
        orgIcon={<BriefcaseIcon />}
        siteLabel={siteInfo.client}
        siteSubLabel={siteInfo.siteName}
        siteIcon={<PinIcon />}
        links={[
          { label: "Home", href: "/" },
          { label: "Quality", href: "/quality/scope-of-work", active: true, items },
          { label: "People", href: "/roster" },
          { label: "Safety", href: "#" },
          { label: "Financials", href: "#" },
        ]}
        showOlivia={false}
        utilityItems={[
          { icon: <PlusCircleIcon />, label: "Quick entries" },
          { icon: <ClipboardIcon />, label: "Manager Queue", onClick: () => setManagerQueueOpen(true) },
          { icon: <EnvelopeIcon />, label: "Messages" },
          { icon: <BellIcon />, label: "Notifications", hasNotification: true },
        ]}
        avatarFallback="EH"
        avatarAlt="Emily Hoehenrieder"
        menuIcon={<MoreIcon />}
      />

      <ManagerQueuePanel open={managerQueueOpen} onClose={() => setManagerQueueOpen(false)} theme="light" />
    </>
  );
}
