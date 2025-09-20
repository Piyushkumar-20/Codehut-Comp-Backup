import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  Download,
  DollarSign,
  TrendingUp,
  Plus,
  Settings,
  LogOut,
  Code,
  Users,
  ShoppingCart,
} from "lucide-react";
import { User, CodeSnippet, GetUserResponse } from "@shared/api";
import Logo from "@/components/Logo";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userSnippets, setUserSnippets] = useState<CodeSnippet[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
    fetchDashboardData();
  }, []);

  const checkAuthentication = () => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      navigate("/login");
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const userResponse = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
        localStorage.setItem("user", JSON.stringify(userData.user));

        const snippetsResponse = await fetch(`/api/snippets/author/${userData.user.id}`);
        if (snippetsResponse.ok) {
          const snippetsData = await snippetsResponse.json();
          setUserSnippets(snippetsData.snippets);
        }
      }

      const statsResponse = await fetch("/api/stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalEarnings = userSnippets.reduce((sum, snippet) => sum + snippet.downloads * snippet.price, 0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardLayout
        userName={user.username}
        avatarUrl={user.avatar}
        onLogout={handleLogout}
        totalSnippets={userSnippets.length}
        totalDownloads={user.totalDownloads}
        totalEarnings={totalEarnings}
        avgRating={user.rating}
        stats={stats}
      />
    </div>
  );
}

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/custom-dashboard/AppSidebar";
import Topbar from "@/components/custom-dashboard/Topbar";
import DateRangePicker from "@/components/custom-dashboard/DateRangePicker";
import Overview from "@/components/custom-dashboard/Overview";
import RecentSales from "@/components/custom-dashboard/RecentSales";

function DashboardLayout({
  userName,
  avatarUrl,
  onLogout,
  totalSnippets,
  totalDownloads,
  totalEarnings,
  avgRating,
  stats,
}: {
  userName: string;
  avatarUrl: string;
  onLogout: () => void;
  totalSnippets: number;
  totalDownloads: number;
  totalEarnings: number;
  avgRating: number;
  stats: any;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <span className="font-semibold">Welcome back, {userName}!</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DateRangePicker />
          </div>
        </header>

        <Topbar />

        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Total Snippets</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSnippets}</div>
                <p className="text-xs text-muted-foreground">Published code snippets</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Total Downloads</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDownloads}</div>
                <p className="text-xs text-muted-foreground">All-time downloads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${`$${totalEarnings}`.replace("$$","$")}</div>
                <p className="text-xs text-muted-foreground">Revenue from sales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Average Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgRating}</div>
                <p className="text-xs text-muted-foreground">User rating</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>Revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>You made 265 sales this month.</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentSales />
              </CardContent>
            </Card>
          </div>

          {stats && (
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Marketplace Overview</CardTitle>
                  <CardDescription>Current marketplace statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{stats.overview.totalSnippets}</div>
                      <div className="text-sm text-gray-600">Total Snippets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{stats.overview.totalUsers}</div>
                      <div className="text-sm text-gray-600">Active Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">${stats.overview.averagePrice}</div>
                      <div className="text-sm text-gray-600">Avg Price</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{stats.overview.averageRating}</div>
                      <div className="text-sm text-gray-600">Avg Rating</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
