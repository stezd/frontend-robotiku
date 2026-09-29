export function DrawerHeader({
    title,
    subtitle,
    badge,
    action,
}: {
    title: string;
    subtitle?: string;
    badge?: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="-mx-6 mb-5 border-b px-6 pb-4 pr-12">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {badge && <div className="mt-2">{badge}</div>}
        </div>
    );
}