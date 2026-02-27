import Link from "next/link";
import { IconBrandGithubFilled } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { BackgroundLights } from "../../../components/ui/background-lights";
import { HomeContentProps } from "../types";
import { HomeHeader } from "./home-header";

const fadeInAnimation = {
  animate: { opacity: 1 },
  initial: { opacity: 0 },
  transition: { duration: 0.5 },
};

const fadeInUpAnimation = {
  animate: { opacity: 1, y: 0 },
  initial: { opacity: 0, y: 20 },
  transition: { duration: 0.5 },
};

function ActionButtons({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex gap-3">
      <Button asChild variant="ghost">
        <Link href={siteConfig.links.docs} target="_blank" rel="noopener noreferrer">
          {t("home.documentation")}
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={siteConfig.links.github} target="_blank" rel="noopener noreferrer">
          <IconBrandGithubFilled className="size-5" />
          {t("home.starOnGithub")}
        </Link>
      </Button>
    </div>
  );
}

export function HomeContent({ isLoading }: HomeContentProps) {
  const t = useTranslations();

  if (isLoading) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-7xl px-6 flex-grow">
      <BackgroundLights />
      <section className="relative flex flex-col items-center justify-center gap-6 m-auto h-full">
        <HomeHeader title="Palmr." />
        <motion.div
          {...fadeInAnimation}
          className="w-full text-lg lg:text-xl text-default-600 mt-4 text-center whitespace-normal"
          transition={{ delay: 0.6, ...fadeInAnimation.transition }}
        >
          {t("home.description")}
        </motion.div>

        <motion.div
          {...fadeInUpAnimation}
          className="flex flex-col items-center gap-6 mt-8"
          transition={{ delay: 0.8, ...fadeInUpAnimation.transition }}
        >
          <ActionButtons t={t} />
          <p className="text-sm opacity-70 max-w-md text-center">{t("home.privacyMessage")}</p>
        </motion.div>
      </section>
    </div>
  );
}
