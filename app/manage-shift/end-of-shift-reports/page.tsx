import { Suspense } from "react";
import type { Metadata } from "next";
import { EndOfShiftReportListPage } from "../../../components/patterns/EndOfShiftReportListPage";

export const metadata: Metadata = {
  title: "Manager Shift Report",
};

export default function ManageShiftEndOfShiftReportsPage() {
  return (
    <Suspense>
      <EndOfShiftReportListPage />
    </Suspense>
  );
}
