import { Link } from "react-router";
import { ShieldCheck, Users, Settings2 } from "lucide-react";

import Heading from "../../components/element/Heading";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const quickActions = [
  {
    title: "Vendor Updates",
    description: "Review vendor approvals and rate changes.",
    path: "/store/vendor-update",
    icon: <ShieldCheck size={20} />,
  },
  {
    title: "User Indents",
    description: "Track indents submitted by individual users.",
    path: "/store/user-indent",
    icon: <Users size={20} />,
  },
  {
    title: "Rate Approvals",
    description: "Manage rate approvals before the PO stage.",
    path: "/store/rate-approval",
    icon: <Settings2 size={20} />,
  },
];

export default function Administration() {
  return (
    <div className="w-full p-4 md:p-6 lg:p-10 space-y-6">
      <Heading
        heading="Administration Hub"
        subtext="Centralized controls for store leadership"
      >
        <ShieldCheck size={48} className="text-primary" />
      </Heading>

      <Card>
        <CardContent className="space-y-6">
          <div>
            <p className="text-muted-foreground text-sm">
              The administration dashboard groups operational links and context
              so leadership can quickly jump between oversight screens.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {quickActions.map((action) => (
              <Card key={action.title} className="border border-dashed border-gray-200">
                <CardContent className="h-full flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                      {action.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{action.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <Link to={action.path} className="self-start">
                    <Button size="sm" variant="link">
                      Open
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
