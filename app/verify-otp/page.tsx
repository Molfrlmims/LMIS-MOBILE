"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Loader2, Shield, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { storeToken } from "@/lib/auth"
import { apiClient, ApiError } from "@/lib/api"

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    if (!storedUserId) {
      router.replace("/login")
    } else {
      setUserId(storedUserId)
    }
  }, [router])

  const handleVerifyOTP = async () => {
    if (otp.length !== 6 || !userId) return

    setIsLoading(true)

    try {
      const data = await apiClient.verifyOtp(otp, Number.parseInt(userId))
      storeToken(data.access_token)
      localStorage.removeItem("userId")
      toast({
        title: "Success",
        description: "OTP verified successfully!",
      })
      router.replace("/dashboard")
    } catch (error) {
      if (error instanceof ApiError) {
        toast({
          title: "Verification Failed",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Network error. Please try again.",
          variant: "destructive",
        })
      }
      setOtp("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <Button variant="ghost" size="sm" className="absolute top-4 left-4" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-br from-somali-blue to-somali-green rounded-full flex items-center justify-center"
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl font-bold">Verify OTP</CardTitle>
            <CardDescription>Enter the 6-digit code sent to your device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              onClick={handleVerifyOTP}
              className="w-full h-12 bg-gradient-to-r from-somali-blue to-somali-green hover:from-somali-blue/90 hover:to-somali-green/90 text-white font-semibold"
              disabled={otp.length !== 6 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify OTP"
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
