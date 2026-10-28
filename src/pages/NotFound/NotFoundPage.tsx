import { Link } from "@tanstack/react-router";
import { PageHead } from "@/components/layout";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <PageHead title="That page doesn't exist">
      <Button asChild className="mt-2"><Link to="/">Go to command centre</Link></Button>
    </PageHead>
  );
}
