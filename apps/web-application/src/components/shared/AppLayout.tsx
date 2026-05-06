import { useState, type ReactNode } from "react";
import { List } from "@phosphor-icons/react";
import { Sidebar } from "@/components/shared/Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f5f5f5] p-[4px]">
      <div className="flex flex-1 overflow-hidden rounded-[8px] border border-[#f5f5f5] bg-white">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              onKeyDown={() => {}}
              role="presentation"
            />
            <div className="fixed inset-y-0 left-0 z-50 w-[260px] md:hidden">
              <Sidebar onMobileClose={() => setMobileMenuOpen(false)} />
            </div>
          </>
        )}

        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Mobile top bar */}
          <div className="flex items-center gap-3 px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] bg-[#f5f5f5]"
            >
              <List size={18} />
            </button>
            <img src="/apple-touch-icon.png" alt="Stage" className="h-5 w-5" />
          </div>

          <div className="flex-1 p-4 sm:p-6 md:p-[44px]">
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
