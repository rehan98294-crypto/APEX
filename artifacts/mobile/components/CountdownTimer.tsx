import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface CountdownTimerProps {
  timeLeft: string;
  size?: "small" | "large";
}

function parseTime(timeStr: string): number {
  const parts = timeStr.split(" ");
  let totalSeconds = 0;
  for (const part of parts) {
    if (part.endsWith("h")) {
      totalSeconds += parseInt(part) * 3600;
    } else if (part.endsWith("m")) {
      totalSeconds += parseInt(part) * 60;
    } else if (part.endsWith("s")) {
      totalSeconds += parseInt(part);
    }
  }
  return totalSeconds;
}

function formatTime(seconds: number): { h: string; m: string; s: string } {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    h: h.toString().padStart(2, "0"),
    m: m.toString().padStart(2, "0"),
    s: s.toString().padStart(2, "0"),
  };
}

export function CountdownTimer({ timeLeft, size = "small" }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(() => parseTime(timeLeft));

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const time = formatTime(seconds);
  const isUrgent = seconds < 3600;

  if (size === "large") {
    return (
      <View style={styles.largeContainer}>
        <View style={[styles.largeSegment, isUrgent && styles.urgent]}>
          <Text style={[styles.largeDigit, isUrgent && styles.urgentText]}>{time.h}</Text>
          <Text style={styles.largeLabel}>HR</Text>
        </View>
        <Text style={styles.largeSeparator}>:</Text>
        <View style={[styles.largeSegment, isUrgent && styles.urgent]}>
          <Text style={[styles.largeDigit, isUrgent && styles.urgentText]}>{time.m}</Text>
          <Text style={styles.largeLabel}>MIN</Text>
        </View>
        <Text style={styles.largeSeparator}>:</Text>
        <View style={[styles.largeSegment, isUrgent && styles.urgent]}>
          <Text style={[styles.largeDigit, isUrgent && styles.urgentText]}>{time.s}</Text>
          <Text style={styles.largeLabel}>SEC</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.smallContainer}>
      <Feather name="clock" size={12} color={isUrgent ? Colors.danger : Colors.gold} />
      <Text style={[styles.smallText, isUrgent && { color: Colors.danger }]}>
        {time.h}:{time.m}:{time.s}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  smallContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  smallText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  largeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  largeSegment: {
    backgroundColor: Colors.darkCardAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 60,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  urgent: {
    borderColor: Colors.danger + "60",
    backgroundColor: Colors.danger + "15",
  },
  urgentText: {
    color: Colors.danger,
  },
  largeDigit: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  largeLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  largeSeparator: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    marginBottom: 14,
  },
});
