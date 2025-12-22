"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, User, Mail, Phone, MapPin, Store, LogOut, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { getStoredToken, removeToken } from "@/lib/auth"
import { apiClient, ApiError } from "@/lib/api"

interface UserProfile {
  id: number
  username: string
  email: string
  phoneNumber: string
  role: string
  region: { id: number; name: string } | null
  markets: Array<{ id: number; name: string }>
  lastLogin: string
  createdAt: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      router.replace("/login")
      return
    }
    fetchProfile()
  }, [router])

  const fetchProfile = async () => {
    try {
      const token = getStoredToken()
      if (!token) return

      const data:any = await apiClient.getReferenceData(token)
      setProfile(data.userWithRelations)
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
          description: "Failed to load profile data",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    removeToken()
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    })
    router.replace("/login")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-somali-blue"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">My Profile</h1>
            <p className="text-sm text-muted-foreground">Account information</p>
          </div>
        </motion.div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto w-20 h-20 bg-gradient-to-br from-somali-blue to-somali-green rounded-full flex items-center justify-center mb-4"
              >
                <User className="w-10 h-10 text-white" />
              </motion.div>
              <CardTitle className="text-2xl">{profile.username}</CardTitle>
              <Badge variant="secondary" className="w-fit mx-auto">
                {profile.role.replace("_", " ").toUpperCase()}
              </Badge>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Contact Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-somali-blue" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>

              {profile.phoneNumber && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-somali-green" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{profile.phoneNumber}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Assignment Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.region ? (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-somali-blue" />
                  <div>
                    <p className="text-sm font-medium">Region</p>
                    <Badge variant="outline">{profile.region.name}</Badge>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Region</p>
                    <p className="text-sm text-muted-foreground">Not assigned</p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-start gap-3">
                <Store className="h-5 w-5 text-somali-green mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Assigned Markets</p>
                  {profile.markets.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.markets.map((market) => (
                        <Badge key={market.id} variant="outline" className="text-xs">
                          {market.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No markets assigned</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Account Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Last Login</p>
                  <p className="text-sm text-muted-foreground">{new Date(profile.lastLogin).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground">{new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logout Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-950 bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
