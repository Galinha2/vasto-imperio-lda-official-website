'use client';
import {useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {adminLaunchDestination} from '@/lib/admin/app-launch.mjs';

export default function AdminAppLaunch() {
  const router = useRouter();
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    // Only check document startup: navigating to Conversations inside the app stays allowed.
    const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const destination = adminLaunchDestination(window.location.pathname, window.location.search, standalone);
    if (destination) router.replace(destination);
  }, [router]);
  return null;
}
