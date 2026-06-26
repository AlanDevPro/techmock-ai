'use client'

import React from 'react';
import { useNavigation } from '../hooks';

export default function Home() {
  const { navigateToAuth, navigateToDashboard } = useNavigation();

  return (
    <div className="min-h-screen bg-black text-white font-sans">

    </div>
  );
}