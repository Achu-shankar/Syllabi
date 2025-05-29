export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="flex h-screen bg-background text-foreground">{children}</div>;
}

