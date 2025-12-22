"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Moon,
  Sun,
  Smartphone,
  Bell,
  Shield,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";

import { useTheme } from "next-themes";

type ToggleSetting = {
  label: string;
  description: string;
  type: "toggle";
  value: boolean;
  onChange: (checked: boolean) => void;
};

type InfoSetting = {
  label: string;
  description: string;
  type: "info";
  value: string;
};

type SettingItem = ToggleSetting | InfoSetting;

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const settingsGroups: {
    title: string;
    icon: any;
    items: SettingItem[];
  }[] = [
    {
      title: "Appearance",
      icon: theme === "dark" ? Moon : Sun,
      items: [
        {
          label: "Dark Mode",
          description: "Switch between light and dark themes",
          type: "toggle",
          value: theme === "dark",
          onChange: () => setTheme(theme === "dark" ? "light" : "dark"),
        },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        {
          label: "Push Notifications",
          description: "Receive notifications about report status",
          type: "toggle",
          value: notifications,
          onChange: setNotifications,
        },
      ],
    },
    {
      title: "Data & Sync",
      icon: Smartphone,
      items: [
        {
          label: "Auto Sync",
          description: "Automatically sync data when connected",
          type: "toggle",
          value: autoSync,
          onChange: setAutoSync,
        },
      ],
    },
    {
      title: "Security",
      icon: Shield,
      items: [
        {
          label: "Session Timeout",
          description: "Automatically logout after inactivity",
          type: "info",
          value: "30 minutes",
        },
      ],
    },
    {
      title: "About",
      icon: Info,
      items: [
        {
          label: "App Version",
          description: "Current application version",
          type: "info",
          value: "1.0.0",
        },
        {
          label: "Build",
          description: "Application build number",
          type: "info",
          value: "2025.01.24",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">App preferences</p>
          </div>
        </motion.div>

        {/* Settings Groups */}
        <div className="space-y-4">
          {settingsGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
            >
              <Card className="border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <group.icon className="h-5 w-5 text-somali-blue" />
                    {group.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <Label className="text-sm font-medium">
                          {item.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                      <div className="ml-4">
                        {item.type === "toggle" ? (
                          <Switch
                            checked={item.value}
                            onCheckedChange={item.onChange}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {item.value}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground pt-4"
        >
          <p>LMIS Data Collector</p>
          <p>Livestock Management Information System</p>
        </motion.div>
      </div>
    </div>
  );
}
