import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, History, ChefHat, Search, Wrench, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StroodlyLogo } from "@/components/brand/logo";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agents", label: "Stroodly Library", icon: Users },
    { href: "/runs", label: "Bake Log", icon: History },
    { href: "/templates", label: "Recipe Box", icon: ChefHat },
    { href: "/tools", label: "Kitchen Tools", icon: Wrench },
    { href: "/api-docs", label: "Ingredient API", icon: Code2 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <StroodlyLogo size={28} />
          <h1 className="font-serif font-extrabold text-xl tracking-tight text-foreground">Stroodly</h1>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="block">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 font-medium"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono">
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline-block">Cmd + K to search</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              ST
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 md:p-8 relative">
          <div className="max-w-6xl mx-auto w-full space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
