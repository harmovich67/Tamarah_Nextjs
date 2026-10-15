'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { LoadingState } from '@/components/ui/States';

export default function LogoutRunner() {
  const router = useRouter();
  const qc = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    authService.logout().catch(() => {}).finally(() => {
      clear();
      qc.clear();
      router.replace('/');
    });
  }, [clear, qc, router]);

  return <LoadingState rows={1} />;
}
