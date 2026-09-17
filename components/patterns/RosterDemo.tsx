"use client";

import { useMemo, useState } from "react";
import { Nav } from "./Nav";
import { ManagerQueuePanel } from "./ManagerQueuePanel";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  BellIcon,
  BriefcaseIcon,
  ClipboardIcon,
  ClockIcon,
  EnvelopeIcon,
  MoreIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
} from "./icons";
import type { RosterPerson } from "../../lib/csv";
import styles from "./RosterDemo.module.css";

export type RosterDemoProps = {
  associates: RosterPerson[];
  managers: RosterPerson[];
};

type RosterKind = "associates" | "managers";

export function RosterDemo({ associates, managers }: RosterDemoProps) {
  const [roster, setRoster] = useState<RosterKind>("associates");
  const [query, setQuery] = useState("");
  const [managerQueueOpen, setManagerQueueOpen] = useState(false);

  const rows = roster === "associates" ? associates : managers;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? rows.filter(
          (person) =>
            person.name.toLowerCase().includes(q) ||
            person.position.toLowerCase().includes(q) ||
            person.site.toLowerCase().includes(q)
        )
      : rows;
    return matches.slice(0, 8);
  }, [rows, query]);

  return (
    <div className={styles.page}>
      <Nav
        theme="dark"
        orgLabel="SBM"
        orgIcon={<BriefcaseIcon />}
        siteLabel="Delta"
        siteSubLabel="LaGuardia, NY"
        siteIcon={<PinIcon />}
        links={[
          { label: "Home", href: "#", active: true },
          { label: "Quality", href: "/quality/scope-of-work" },
          { label: "People", href: "#" },
          { label: "Safety", href: "#" },
          { label: "Financials", href: "#" },
        ]}
        utilityItems={[
          { icon: <ClockIcon />, label: "Time" },
          { icon: <ClipboardIcon />, label: "Manager Queue", onClick: () => setManagerQueueOpen(true) },
          { icon: <EnvelopeIcon />, label: "Messages" },
          { icon: <BellIcon />, label: "Notifications", hasNotification: true },
        ]}
        avatarFallback="EH"
        avatarAlt="Emily Hoehenrieder"
        menuIcon={<MoreIcon />}
      />

      <main className="mx-auto flex max-w-[1120px] flex-col gap-6 p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className={styles.heading}>Team Roster</h1>
            <p className={styles.subheading}>
              {rows.length} {roster === "associates" ? "associates" : "managers"} at Delta –
              LaGuardia, NY
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Input
              wrapperClassName={styles.searchInput}
              placeholder="Search by name, role, or site"
              icon={<SearchIcon />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              theme="dark"
              aria-label="Search roster"
            />
            <Button
              variant={roster === "associates" ? "primary" : "secondary"}
              onClick={() => setRoster("associates")}
            >
              Associates
            </Button>
            <Button
              variant={roster === "managers" ? "primary" : "secondary"}
              onClick={() => setRoster("managers")}
            >
              Managers
            </Button>
            <Button variant="altPrimary" icon={<PlusIcon />}>
              Add Person
            </Button>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Site</th>
                <th>Shift</th>
                <th>Phone</th>
                <th>Pay</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((person) => (
                <tr key={person.email}>
                  <td>
                    <div className={styles.personCell}>
                      <img src={person.avatar} alt="" className={styles.avatar} />
                      <div className="flex flex-col">
                        <span className={styles.personName}>{person.name}</span>
                        <span className={styles.personEmail}>{person.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{person.position}</td>
                  <td className={styles.muted}>{person.site}</td>
                  <td className={styles.muted}>{person.shift}</td>
                  <td className={styles.muted}>{person.phone}</td>
                  <td className={styles.muted}>{person.money}</td>
                  <td>
                    <Button
                      variant="flatIcon"
                      theme="dark"
                      icon={<MoreIcon />}
                      aria-label={`More options for ${person.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className={styles.emptyState}>No one matches “{query}.”</div>
          )}
        </div>
      </main>

      <ManagerQueuePanel open={managerQueueOpen} onClose={() => setManagerQueueOpen(false)} theme="dark" />
    </div>
  );
}
