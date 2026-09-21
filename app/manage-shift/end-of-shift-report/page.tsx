import { Suspense } from "react";
import type { Metadata } from "next";
import { EndOfShiftReportPage } from "../../../components/patterns/EndOfShiftReportPage";
import { loadContractBuildings } from "../../../lib/sowContractLoader";

export const metadata: Metadata = {
  title: "Manager Shift Report",
};

export default async function ManageShiftEndOfShiftReportPage() {
  const contractBuildings = await loadContractBuildings();
  return (
    <Suspense>
      <EndOfShiftReportPage contractBuildings={contractBuildings} />
    </Suspense>
  );
}
