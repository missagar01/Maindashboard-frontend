import type { ReactNode } from "react";

import Heading from "../../components/element/Heading";
import { Card, CardContent } from "../../components/ui/card";

interface StorePageShellProps {
  icon: ReactNode;
  heading: string;
  subtext: string;
  children: ReactNode;
}

export default function StorePageShell({
  icon,
  heading,
  subtext,
  children,
}: StorePageShellProps) {
  return (
    <div className="w-full p-4 md:p-6 lg:p-10 space-y-6">
      <Heading heading={heading} subtext={subtext}>
        {icon}
      </Heading>
      <Card>
        <CardContent className="space-y-6">{children}</CardContent>
      </Card>
    </div>
  );
}
