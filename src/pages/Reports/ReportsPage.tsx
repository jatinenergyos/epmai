import { tfName } from "@/data/engine";
import { PageHead } from "@/components/layout";
import { ReportLibrary } from "@/components/ReportLibrary";
import { useHorizon } from "@/lib/horizon";

export function ReportsPage() {
  const { tf } = useHorizon();
  return (
    <>
      <PageHead
        crumb="Report library"
        title={<>Reports <span className="font-normal text-muted-foreground">· {tfName(tf)}</span></>}
      />
      <ReportLibrary tf={tf} />
    </>
  );
}
