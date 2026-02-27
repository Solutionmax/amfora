import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { BackgroundLights } from "@/components/ui/background-lights";

export function LoadingScreen() {
  const t = useTranslations();

  return (
    <div className="fixed inset-0 bg-background">
      <BackgroundLights />
      <div className="relative flex flex-col items-center justify-center h-full">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          className="flex flex-col items-center gap-4"
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="text-xl font-semibold text-primary">{t("common.loading")}</span>
        </motion.div>
      </div>
    </div>
  );
}
