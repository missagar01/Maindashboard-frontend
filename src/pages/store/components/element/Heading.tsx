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
        <div className="rounded-none bg-gradient-to-br from-blue-100 via-purple-50 to-blue-50 sm:rounded-md">
            <div className="flex justify-between px-3 py-3 sm:p-5">
                <div className="flex items-center gap-2">
                    {children && (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-indigo-700 shadow sm:h-14 sm:w-14 sm:rounded-2xl">
                            {children}
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-primary sm:text-2xl">{heading}</h1>
                        <p className="text-xs text-muted-foreground sm:text-sm">{subtext}</p>
                    </div>
                </div>
            </div>
            {tabs && (
                <TabsList className="grid w-full grid-cols-2 rounded-none bg-transparent px-2 pb-2 sm:rounded-b-md sm:px-0 sm:pb-0">
                    <TabsTrigger className="text-sm" value="pending">Pending</TabsTrigger>
                    <TabsTrigger className="text-sm" value="history">History</TabsTrigger>
                </TabsList>
            )}
        </div>
    );
};

