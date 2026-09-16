import React from "react";
import { EmptyState } from "@/components/primitives/EmptyState";

export default function MethodPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        title="Methodology"
        message="Documentation on attribution math and float grip calculation."
      />
    </div>
  );
}
