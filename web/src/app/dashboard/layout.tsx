import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard · Cerberus",
  description: "Live agent incidents from SigNoz — ranked by failure and spend.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
