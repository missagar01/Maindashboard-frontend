import type { ReactNode } from "react";

import Heading from "../../components/element/Heading";
import { Card, CardContent } from "../../components/ui/card";
import { cn } from "../../lib/utils";

interface StorePageShellProps {
  icon: ReactNode;
  heading: string;
  subtext: string;
  children: ReactNode;
  containerClassName?: string;
  contentCardClassName?: string;
  contentClassName?: string;
}

export default function StorePageShell({
  icon,
  heading,
  subtext,
  children,
  containerClassName,
  contentCardClassName,
  contentClassName,
}: StorePageShellProps) {
  return (
    <div className={cn("w-full space-y-6 p-4 md:p-6 lg:p-10", containerClassName)}>
      <Heading heading={heading} subtext={subtext}>
        {icon}
      </Heading>
      <Card className={cn(contentCardClassName)}>
        <CardContent className={cn("space-y-6", contentClassName)}>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
