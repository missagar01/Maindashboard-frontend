import type { ReactNode } from 'react';
import { TabsList, TabsTrigger } from '../ui/tabs';

interface HeaderProps {
    children?: ReactNode;
    heading: string;
    subtext: string;
    tabs?: boolean;
}

export default ({ children, heading, subtext, tabs = false }: HeaderProps) => {
    return (
        <div className="bg-gradient-to-br from-blue-100 via-purple-50 to-blue-50 rounded-md">
            <div className="flex justify-between p-5">
                <div className="flex gap-2 items-center">
                    {children && (
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/80 shadow text-indigo-700">
                            {children}
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-primary">{heading}</h1>
                        <p className="text-muted-foreground text-sm">{subtext}</p>
                    </div>
                </div>
            </div>
            {tabs && (
                <TabsList className="w-full rounded-none bg-transparent rounded-b-md">
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
            )}
        </div>
    );
};

