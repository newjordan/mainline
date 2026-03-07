import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DemoLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>MainLine Test Drive</CardTitle>
          <CardDescription>
            Demo mode is active. Authentication is simulated for evaluation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Explore customers, auto-reply workflow, quotes, invoices, and search with realistic
            sample data.
          </p>
          <Button asChild className="w-full">
            <Link href="/demo/home">Open Demo Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
