'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function UnauthorizedPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[UnauthorizedPage] Sign out failed:', error);
    } finally {
      router.push('/');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              Access Denied - Your account is not authorized to access this
              application. Contact the administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} disabled={isLoading} className="w-full">
              {isLoading ? 'Signing out...' : 'Sign out'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
