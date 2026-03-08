import type { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { TabsList, TabsTrigger } from '../ui/tabs';

interface HeaderProps {
    children?: ReactNode;
    heading: string;
    subtext: string;
    tabs?: boolean;
}

export default ({ children, heading, subtext, tabs = false }: HeaderProps) => {
    const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

    const handleToggle = () => {
        if (window.innerWidth >= 1280) {
            toggleSidebar();
        } else {
            toggleMobileSidebar();
        }
    };

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
                <button
                    type="button"
                    onClick={handleToggle}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                    aria-label="Toggle Sidebar"
                >
                    {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
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

