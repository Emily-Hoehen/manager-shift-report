import { Suspense } from "react";
import type { Metadata } from "next";
import { DailyReportPage } from "../../../components/patterns/DailyReportPage";
import { loadContractBuildings } from "../../../lib/sowContractLoader";

export const metadata: Metadata = {
  title: "Daily Report",
};

export default async function ManageShiftDailyReportPage() {
  const contractBuildings = await loadContractBuildings();
  return (
    <Suspense>
      <DailyReportPage contractBuildings={contractBuildings} />
    </Suspense>
  );
}
