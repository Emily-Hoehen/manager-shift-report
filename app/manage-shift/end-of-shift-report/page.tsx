import { Suspense } from "react";
import { EndOfShiftReportPage } from "../../../components/patterns/EndOfShiftReportPage";
import { loadContractBuildings } from "../../../lib/sowContractLoader";

export default async function ManageShiftEndOfShiftReportPage() {
  const contractBuildings = await loadContractBuildings();
  return (
    <Suspense>
      <EndOfShiftReportPage contractBuildings={contractBuildings} />
    </Suspense>
  );
}
