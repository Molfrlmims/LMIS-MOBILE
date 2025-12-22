"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, FileText, User, LogOut, MapPin, Store, Settings, Moon, Sun } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { getStoredToken, removeToken } from "@/lib/auth"
import { useTheme } from "next-themes"
import { apiClient, ApiError } from "@/lib/api"

interface UserData {
  id: number
  username: string
  email: string
  region: { id: number; name: string } | null
  markets: Array<{ id: number; name: string }>
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      router.replace("/login")
      return
    }
    fetchUserData()
  }, [router])

  const fetchUserData = async () => {
    try {
      const token = getStoredToken()
      if (!token) return

      const data:any = await apiClient.getReferenceData(token)
      setUserData(data.userWithRelations)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          removeToken()
          router.replace("/login")
          return
        }
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    removeToken()
    router.replace("/login")
  }

  const menuItems = [
    {
      title: "Record Market Data",
      description: "Submit new livestock price reports",
      icon: PlusCircle,
      href: "/record-data",
      color: "from-somali-blue to-blue-600",
    },
    {
      title: "View My Reports",
      description: "Manage your submitted reports",
      icon: FileText,
      href: "/reports",
      color: "from-somali-green to-green-600",
    },
    {
      title: "My Profile",
      description: "View and edit profile information",
      icon: User,
      href: "/profile",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Settings",
      description: "App preferences and configuration",
      icon: Settings,
      href: "/settings",
      color: "from-gray-500 to-gray-600",
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-somali-blue"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
            <p className="text-muted-foreground">{userData?.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-500 hover:text-red-600">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>

        {/* User Info Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-somali-blue/10 to-somali-green/10 border-0">
            <CardContent className="p-4">
              <div className="space-y-3">
                {userData?.region && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-somali-blue" />
                    <span className="text-sm font-medium">Region:</span>
                    <Badge variant="secondary">{userData.region.name}</Badge>
                  </div>
                )}
                {userData?.markets && userData.markets.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Store className="h-4 w-4 text-somali-green mt-0.5" />
                    <div>
                      <span className="text-sm font-medium">Markets:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {userData.markets.map((market) => (
                          <Badge key={market.id} variant="outline" className="text-xs">
                            {market.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Menu Items */}
        <div className="grid gap-4">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-0 bg-card/50 backdrop-blur-sm"
                onClick={() => router.push(item.href)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center`}
                    >
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
