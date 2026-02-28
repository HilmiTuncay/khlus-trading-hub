"use client";

import dynamic from "next/dynamic";

const ChatArea = dynamic(() => import("@/components/chat/ChatArea").then((m) => m.ChatArea), {
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
  ),
});

export default function ServersPage() {
  return <ChatArea />;
}
