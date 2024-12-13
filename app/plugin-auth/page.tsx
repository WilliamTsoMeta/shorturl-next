"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { createClient, supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';

const SOCIAL_ACCOUNTS = [
  {
    name: "Google",
    platform: "google",
    icon: "https://www.svgrepo.com/show/475656/google-color.svg",
  },
  {
    name: "ClickUp",
    platform: "clickup",
    icon: "https://www.svgrepo.com/show/331339/clickup.svg",
  },
];

interface PlatformStatus {
  platform: string;
  connected: boolean;
}

export default function PluginAuthPage() {
  const router = useRouter();
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, boolean>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [pageLoading, setPageLoading] = useState(true);

  const getDetail = async () => {
    try {
      setPageLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/platform-tokens`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch platform tokens');
      }

      const data = await response.json();
      const statusMap: Record<string, boolean> = {};
      data.platforms?.forEach((platform: PlatformStatus) => {
        statusMap[platform.platform] = platform.connected;
      });
      setPlatformStatuses(statusMap);
    } catch (error) {
      console.error("Failed to fetch platform tokens:", error);
      if ((error as any)?.status === 401) {
        router.push('/login');
      }
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    getDetail();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (code && state) {
      const handleCallback = async () => {
        try {
          const decodedState = JSON.parse(atob(state));
          const { platform } = decodedState;

          const body = JSON.stringify({
            state,
            code,
          });

          const endpoint = `${process.env.NEXT_PUBLIC_WINDMILL_SYNC}/limq_${platform}/get_${platform}_token`;

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_WINDMILL}`,
            },
            body,
          });

          const data = await response.json();
          if (!data.success) {
            throw new Error(`Failed to exchange token for ${platform}`);
          }

          // message.success(`Successfully connected to ${platform}`);
          await getDetail();
        } catch (error) {
          console.error("Auth callback error:", error);
        }
      };
      handleCallback();
    }
  }, []);

  const handleConnect = async (platform: string ) => {
    setLoadingStates((prev) => ({ ...prev, [platform]: true }));
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const body = JSON.stringify({
        bearerToken: session?.access_token
      });      
      const endpoint = `${process.env.NEXT_PUBLIC_WINDMILL_SYNC}/limq_${platform}/get_${platform}_auth_url`;

      

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_WINDMILL}`,
        },
        body,
      });

      const data = await response.json();
      console.log("data", data);
      if (data?.url) {
        window.location.href = data?.url;
      } else {
        throw new Error("Failed to get auth URL from Windmill");
      }
    } catch (error) {
      console.error(`Failed to get ${platform} auth URL:`, error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const handleRevoke = async (platform: string) => {
    setLoadingStates((prev) => ({ ...prev, [platform]: true }));
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${platform}/auth/`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to revoke ${platform} access`);
      }

      await getDetail();
    } catch (error) {
      console.error(`Failed to revoke ${platform} access:`, error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const renderAuthButton = (account: typeof SOCIAL_ACCOUNTS[0]) => {
    const isLoading = loadingStates[account.platform] || false;
    const isConnected = platformStatuses[account.platform];

    return isConnected ? (
      <button
        onClick={() => handleRevoke(account.platform)}
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md"
      >
        Disconnect
      </button>
    ) : (
      <button
        onClick={() => handleConnect(account.platform)}
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md"
      >
        Connect
      </button>
    );
  };

  if (pageLoading) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 w-full max-w-[1000px] mx-auto my-0">
        {SOCIAL_ACCOUNTS.map((account) => (
          <div
            key={account.platform}
            className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex gap-4 items-center">
              <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Image
                  src={account.icon}
                  alt={account.name}
                  width={24}
                  height={24}
                  className="dark:invert"
                />
              </div>
              <span className="text-gray-900 dark:text-gray-100 font-medium">{account.name}</span>
            </div>
            {renderAuthButton(account)}
          </div>
        ))}
      </div>
    </>
  );
}
