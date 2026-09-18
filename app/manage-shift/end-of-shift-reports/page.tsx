import { Suspense } from "react";
import { EndOfShiftReportListPage } from "../../../components/patterns/EndOfShiftReportListPage";

export default function ManageShiftEndOfShiftReportsPage() {
  return (
    <Suspense>
      <EndOfShiftReportListPage />
    </Suspense>
  );
}
